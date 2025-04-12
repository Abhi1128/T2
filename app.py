from flask import Flask, render_template_string, request, jsonify
import json, random, pandas as pd, os

app = Flask(__name__)

RESULTS_FILE = "experiment_results.csv"

def load_words(filename):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return []

# Load all word lists (from the same folder as app.py)
positive_inducing = load_words("positive_inducing_words.json")
negative_inducing = load_words("negative_inducing_words.json")
abstract_positive = load_words("abstract_positive_words.json")
abstract_negative = load_words("abstract_negative_words.json")
neutral_words = load_words("neutral_words.json")

# Sanity check
REQUIRED = {
    "positive_inducing": 20,
    "negative_inducing": 20,
    "abstract_positive": 60,
    "abstract_negative": 60,
    "neutral_words": 120
}
for key, req in REQUIRED.items():
    lst = locals()[key]
    if len(lst) < req:
        print(f"Error: {key} needs {req} items, found {len(lst)}")
        exit(1)

def generate_trials():
    block1, block2 = [], []
    for i in range(20):
        block1.append({
            "condition": "positive",
            "emotion_word": positive_inducing[i],
            "words": [
                abstract_positive[i],
                abstract_negative[i],
                neutral_words[2*i],
                neutral_words[2*i+1]
            ]
        })
        block1.append({
            "condition": "negative",
            "emotion_word": negative_inducing[i],
            "words": [
                abstract_positive[20+i],
                abstract_negative[20+i],
                neutral_words[40+2*i],
                neutral_words[40+2*i+1]
            ]
        })
        block2.append({
            "condition": "none",
            "emotion_word": None,
            "words": [
                abstract_positive[40+i],
                abstract_negative[40+i],
                neutral_words[80+2*i],
                neutral_words[80+2*i+1]
            ]
        })
    random.shuffle(block1)
    random.shuffle(block2)
    return {"block1": block1, "block2": block2}

# Load HTML content directly from a file
@app.route("/")
def index():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            return render_template_string(f.read())
    except Exception as e:
        return f"Error loading HTML: {e}"

@app.route("/get_trial")
def get_trial():
    return jsonify(generate_trials())

@app.route("/submit_results", methods=["POST"])
def submit_results():
    data = request.json or []
    df = pd.DataFrame(data)
    df.to_csv(RESULTS_FILE, index=False)
    return jsonify({"message": "Results saved successfully!"})

if __name__ == "__main__":
    app.run(debug=True)
