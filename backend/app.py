import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import auth
import institutions
from config import Config
from errors import ApiError, error_response

log = logging.getLogger("iip")


def create_app():
    app = Flask(__name__)
    app.json.sort_keys = False  # keep profile field order for the frontend

    CORS(app, resources={r"/api/*": {"origins": Config.FRONTEND_ORIGINS}})
    app.register_blueprint(auth.bp)
    app.register_blueprint(institutions.bp)

    if Config.missing():
        log.warning("Missing environment variables: %s — copy .env.example to .env", ", ".join(Config.missing()))

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "supabase_configured": not Config.missing()})

    @app.errorhandler(ApiError)
    def api_error(e):
        return error_response(e.status, e.message)

    @app.errorhandler(HTTPException)
    def http_error(e):
        return error_response(e.code, e.description)

    @app.errorhandler(Exception)
    def unexpected(e):
        log.exception("Unhandled error")
        return error_response(500, "Something went wrong on the server.")

    return app


app = create_app()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=Config.DEBUG)
