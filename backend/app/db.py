from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .config import Config
from .models.database import Base

engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URI,
    connect_args={"check_same_thread": False} if "sqlite" in Config.SQLALCHEMY_DATABASE_URI else {}
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))


def init_db(uri=None):
    global engine, SessionLocal
    if not uri:
        try:
            from flask import current_app
            if current_app and current_app.config.get("SQLALCHEMY_DATABASE_URI"):
                uri = current_app.config.get("SQLALCHEMY_DATABASE_URI")
        except Exception:
            pass
    if uri and uri != str(engine.url):
        engine = create_engine(
            uri,
            connect_args={"check_same_thread": False} if "sqlite" in uri else {}
        )
        SessionLocal.configure(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass

