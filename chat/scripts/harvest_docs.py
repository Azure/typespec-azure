import os
import requests
import json
import argparse

def process_files(directory, file_extensions):
    print(f"Processing {file_extensions} files in {directory}...")
    results = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(tuple(file_extensions)):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    newObject = {
                        'file_content': content,
                        'file_path': file_path,
                        'link_to_file': f"file://{file_path}"
                    }
                    results.append(newObject)
                except Exception as err:
                    print(f'Error occurred while processing {file_path}: {err}')

    print(f"Finished processing {file_extensions} files.")
    return results

def main():
    parser = argparse.ArgumentParser(description='Process some files.')
    parser.add_argument('filetype', type=str, help='The type of files to process')
    args = parser.parse_args()

    if args.filetype == 'md':
        directory = '../../docs'
        file_extensions = ('.md', '.mdx')
        output_file = "markdown_files_data.json"
    elif args.filetype == 'ts':
        directory = '../../packages/samples/specs'
        file_extensions = ('.tsp',)
        output_file = "typespec_files_data.json"
    elif args.filetype == 'md2':
        directory = '../../core/docs'
        file_extensions = ('.md', '.mdx')
        output_file = "markdown_files_data2.json"
    elif args.filetype == 'ts2':
        directory = '../../core/packages/samples/specs'
        file_extensions = ('.tsp',)
        output_file = "typespec_files_data2.json"       
    else:
        print(f"Unknown filetype: {args.filetype}")
        return

    files_data = process_files(directory, file_extensions)
    print("Writing processed data to JSON file...")
    with open(output_file, "w") as outfile:
        json.dump(files_data, outfile)

    print(f"Finished writing to file: {output_file}")

if __name__ == "__main__":
    main()
