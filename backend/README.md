# FAIVOR validator backend

## Installation and running locally

Install the dependencies with
```bash
poetry install
```

Run the REST API server:

```bash
uvicorn src.FAIRmodels-validator.api_controller:app --reload
```

The server will be running on [http://localhost:8000](http://localhost:8000). You can access the API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).