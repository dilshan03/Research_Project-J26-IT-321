FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
# Retries + longer timeout: parallel compose builds share bandwidth and a slow
# download otherwise aborts pip with exit code 2 (ReadTimeoutError).
RUN pip install --no-cache-dir --default-timeout=120 --retries 10 -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]
