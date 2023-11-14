"""
This script processes input JSON files containing information about various repositories,
generates embeddings for the README content and questions derived from the content,
and stores the data in a Qdrant collection. It leverages the OpenAI API to create
embeddings and generate questions, and the QdrantClient to interact with the Qdrant server.
The script is designed to improve search capabilities and provide more relevant results
by using embeddings and question-answer pairs.
"""
import json
import sys
import time
import re
import os
import glob
from azure.core.credentials import AzureKeyCredential
import openai
from dotenv import load_dotenv
import requests
import asyncio
import uuid
from qdrant_client import QdrantClient
# from qdrant_client.models import Distance, VectorParams
from qdrant_client.models import PointStruct

load_dotenv()

openai.api_key = os.getenv("AZURE_OPENAI_API_KEY")
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
openai.api_type = "azure"
openai.api_version = "2023-07-01-preview"

# Initialize a QdrantClient instance with default host and port to interact with Qdrant server.
# This particular instance is running as a docker container on my local machine.
client = QdrantClient(url="http://qdrantav6kiton6oef6.eastus.azurecontainer.io", port=6333)

# Define a prompt for OpenAI API to generate questions and answers based on given content and repository name.
qna_prompt = """Given the following content, generate the top five questions it answers and provide the answers in a JSON object following this schema: an object with a 'pairs' property containing an array of objects, each with keys 'Q-x' and 'A-x', where 'x' is an incrementing integer, and string values for questions and answers.

Content:

{content}

Example output:
{
  "pairs": [
    {
      "Q-1": "Question 1?",
      "A-1": "Answer 1."
    },
    ...
  ]
}
"""

samples_prompt = """Generate the top five questions a developer could ask that are answered by the provided doc or code sample. Return the answers in a JSON object with the following structure: ```json { "pairs": [ { "Q-1": "question_1", "A-1": "answer_1" }, { "Q-2": "question_2"""

# is_valid_response() function checks if response from OpenAI API is
# valid by verifying structure and content.
def is_valid_response(response):
    return (
        isinstance(response, dict)
        and isinstance(response.get("choices"), list)
        and response.get("choices")
        and isinstance(response["choices"][0], dict)
        and isinstance(response["choices"][0].get("message"), dict)
        and isinstance(response["choices"][0]["message"].get("content"), str)
    )

# Generate questions and answers: generate_questions() is an async 
# function that sends request to OpenAI API to generate QnA based on input.
# Retries request if response is invalid, up to a maximum number of attempts.
async def generate_questions(input, repo_name, samples=False):
    max_attempts = 3
    retry_delay = 2  # Delay between retries in seconds
    system_prompt = samples_prompt if samples else qna_prompt
    for attempt in range(max_attempts):
        response = openai.ChatCompletion.create(
            engine=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input},
                {"role": "user", "content": repo_name},
            ],
            max_tokens=2000,
            n=1,
            stop=None,
            temperature=0.5,
            top_p=0.8,
        )
        if is_valid_response(response):
            reply = response.choices[0].message.content
            return reply
        else:
            print(f"Invalid response returned from chat function, retrying (attempt {attempt + 1}):", response)

        if attempt < max_attempts - 1:
            await asyncio.sleep(retry_delay)

    print(f"Failed to get a valid response after {max_attempts} attempts. Skipping Q&A for this chunk.")
    return "{}"  # Return an empty JSON string as a fallback

# Create embeddings: create_embedding() is an async function that sends
# request to OpenAI API to create embeddings for given data.
# Handles rate limit errors by retrying request after a specified delay.
async def create_embedding(data):
    MAX_RETRIES = 5
    retry_count = 0
    while retry_count < MAX_RETRIES:
        try:
            response = openai.Embedding.create(
                engine="text-embedding-ada-002",
                input=data
            )
            embeddings = response.data[0].embedding
            # print("embeddings: ", embeddings)
            return embeddings
        except Exception as e:
            error_message = str(e)
            if "exceeded call rate limit" in error_message:
                delay_str = re.search(r'Please retry after (\d+)', error_message)
                if delay_str:
                    delay = int(delay_str.group(1))
                    print(f"Rate limit exceeded. Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    retry_count += 1
                else:
                    raise Exception("Unknown error message when creating embeddings.")
            else:
                raise e

    raise Exception("Rate limit error. All retries failed.")

# parse_input_files() is an async function that processes input
# JSON files containing repository information.
# Reads README content, repository name, link, and programming language.
# Creates embeddings and inserts data into Qdrant collection.
async def parse_input_files(collection_name, file_path):
    samples = 'samples' in file_path
    with open(file_path, 'r') as f:
        data = json.load(f)

    for item in data:
        file_text = item['file_content']
        file_path = item['file_path']
        link_to_file = item['link_to_file']
        language = 'typespec'
        repo_name = 'typespec-azure'

        # Chunk the content for better granularity
        # Adjust the chunk size as needed
        chunk_size = 30000 #  GPT-4-32k can support a large context window, so let's go crazy
        chunks = [file_text[i:i + chunk_size] for i in range(0, len(file_text), chunk_size)]

        for chunk in chunks:
            # Embed the chunk using the create_embedding function
            vector_embedding = await create_embedding(chunk)

            # Call the insert_to_qdrant function
            await insert_to_qdrant(collection_name, repo_name, chunk, vector_embedding, link_to_file, language)

            # Generate question & answer pairs from the README_text to improve qdrant search results
            chat_response = await generate_questions(chunk, repo_name, samples)

            if chat_response.strip() != "{}":  # Add this condition to check if the response is not an empty JSON string
                try:
                    qna_pairs_data = json.loads(chat_response)["pairs"]
                except json.JSONDecodeError:
                    print(f"Invalid JSON response: {chat_response}")
                    continue

                for pair in qna_pairs_data:
                    for key, value in pair.items():
                        if key.startswith("Q"):
                            question = value
                            answer_key = key.replace("Q", "A")
                            answer = pair[answer_key]

                            question_embedding = await create_embedding(question)
                            answer = answer + " " + chunk
                            print("Repo name:", repo_name)
                            print("Question:", question)
                            print("Answer:", answer.encode('utf-8'))
                            await insert_to_qdrant(collection_name, repo_name, answer, question_embedding, link_to_file, language)

# insert_to_qdrant() is an async function that inserts data into Qdrant collection using QdrantClient.
async def insert_to_qdrant(collection_name, repo_name, chunk, vector_embedding, link_to_repo, language):
    # Generate a UUID for the point ID
    point_id = str(uuid.uuid4())
    point = PointStruct(
        id=point_id,
        vector=vector_embedding,
        payload={
            'README_text': chunk,
            'repo_name': repo_name,
            'link_to_repo': link_to_repo,
            'language': language
        }
    )

    response = client.upsert(collection_name, [point])

    if response.status == 'completed':
        print(f"Successfully inserted data for {repo_name}-{point_id}")
    else:
        print(f"Error inserting data for {repo_name}-{point_id}: {response}")

# create_qdrant_collection() checks if Qdrant collection exists and creates it if it doesn't.
# Specifies collection name, vector size, and distance metric.
def create_qdrant_collection(collection_name, vector_size, distance_metric='Cosine'):
    # Check if the collection exists
    response = requests.get(f"http://qdrantav6kiton6oef6.eastus.azurecontainer.io:6333/collections/{collection_name}")

    if response.status_code == 200:
        print(f"Collection {collection_name} already exists.")
        return True

    # Wait for a few seconds to ensure the Qdrant server is fully initialized
    time.sleep(5)

    print("creating collection..")

    # Create the collection if it doesn't exist
    payload = {
        'vectors': {
            'size': vector_size,
            'distance': distance_metric
        },
    }

    # print("url: ", f"http://localhost:6333/collections/{collection_name}")

    response = requests.put(f"http://qdrantav6kiton6oef6.eastus.azurecontainer.io:6333/collections/{collection_name}", json=payload)
    print("response: ", response)

    if response.status_code != 200:
        print(f"Error creating collection {collection_name}: {response.text}")
        return False
    else:
        print(f"Successfully created collection {collection_name}")
        return True

# main() is an async function that runs the script. Sets collection
# name and vector size, checks command-line arguments for input files,
# creates Qdrant collection if it doesn't exist, and processes input
# files using parse_input_files() function.
async def main():
    vector_size = 1536  # Update this value based on your embeddings

    if len(sys.argv) < 3:  # Change this to check for at least 3 arguments
        print("Usage: python script.py <collection_name> <file1.json> <file2.json> ...")
        sys.exit(1)

    # Get the collection name from the command-line arguments
    collection_name = sys.argv[1]

    # Create the Qdrant collection if it doesn't exist
    collection_created = create_qdrant_collection(collection_name, vector_size)

    if not collection_created:
        print("Failed to create collection. Aborting.")
        sys.exit(1)

    # Start of the changes
    input_files = sys.argv[2:]  # Change this to start from the second argument
    json_files = []

    for input_file in input_files:
        json_files.extend(glob.glob(input_file))

    for file_path in json_files:
        await parse_input_files(collection_name, file_path)
    # End of the changes

if __name__ == "__main__":
    asyncio.run(main())
