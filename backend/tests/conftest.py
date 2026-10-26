import pytest
from backend.app import create_app
from backend.app.config import Config
from backend.app.db import init_db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AGENT_AUTH_TOKEN = "test_agent_secret_token"
    LOOPBACK_ONLY = False


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db(TestConfig.SQLALCHEMY_DATABASE_URI)
        yield client

