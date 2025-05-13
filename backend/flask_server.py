# backend/flask_server.py
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

client = MongoClient("mongodb://localhost:27017/")
db = client['investment_db']
collection = db['strategies']

@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    data = list(collection.find({}))
    for d in data:
        d['_id'] = str(d['_id'])  # ObjectId를 문자열로 변환
    return jsonify(data)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
