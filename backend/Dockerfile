# Use official Python lightweight image
FROM python:3.11-slim

# Install system dependencies, including Tesseract OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Set memory allocator tuning for low-RAM environments like Render Free Tier
ENV MALLOC_ARENA_MAX=2

# Copy requirements
COPY requirements.txt .

# Install CPU-only PyTorch first to prevent downloading massive CUDA binaries
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the port
EXPOSE 8000

# Start FastAPI using the PORT environment variable provided by Render
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
