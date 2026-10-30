from flask import jsonify


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def error_response(status, message):
    return jsonify({"error": message}), status
