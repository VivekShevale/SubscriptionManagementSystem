"""
app/routes/upload.py
Cloudinary Upload Blueprint
----------------------------
Handles image uploads to Cloudinary for products and user avatars.
Returns the secure Cloudinary URL for storage in the database.
"""

import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.helpers import admin_or_internal_required

upload_bp = Blueprint("upload", __name__)

# Configure Cloudinary from environment variables
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
)


@upload_bp.route("/image", methods=["POST"])
@jwt_required()
def upload_image():
    """
    Upload an image to Cloudinary.
    Accepts multipart/form-data with 'file' field.
    Returns the secure URL for the uploaded image.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]
    folder = request.form.get("folder", "subscription-ms")

    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    try:
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp", "gif"],
            transformation=[{"quality": "auto", "fetch_format": "auto"}],
        )
        return jsonify({
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
        }), 200
    except cloudinary.exceptions.Error as e:
        print("fail")
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500