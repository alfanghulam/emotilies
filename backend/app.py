# Backend deteksi emosi (Flask + DeepFace). Jika sudah punya backend sendiri, cukup pastikan
# POST /detect menerima {"image": dataURL} dan mengembalikan {"emotion","confidence","scores"}.
import base64
import cv2
import numpy as np
from deepface import DeepFace
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.post("/detect")
def detect():
    try:
        b64 = request.get_json(force=True)["image"].split(",")[-1]
        img = cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8), cv2.IMREAD_COLOR)
        res = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False)
        res = res[0] if isinstance(res, list) else res
        scores = {k.lower(): round(v / 100, 4) for k, v in res["emotion"].items()}
        emotion = max(scores, key=scores.get)
        return jsonify(emotion=emotion, confidence=scores[emotion], scores=scores)
    except Exception as e:
        return jsonify(error=str(e)), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
