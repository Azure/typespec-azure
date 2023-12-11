import yaml
import json
import sys

class SwaggerCompare:

    def __init__(self):
        self._models = []

        args = sys.argv[1:]
        if len(args) != 2:
            print("usage: swagger_compare.py FILE1 FILE2")
            sys.exit(1)

        file1 = args[0]
        file2 = args[1]

        with open(file1, "r") as infile:
            self._file1 = json.loads(infile.read())

        with open(file2, "r") as infile:
            self._file2 = json.loads(infile.read())            

    def save(self):
        with open("file1.yml", "w") as outfile:
            yaml.dump(self._file1, outfile)

        with open("file2.yml", "w") as outfile:
            yaml.dump(self._file2, outfile)


model = SwaggerCompare()
model.save()
