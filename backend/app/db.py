from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import StaticPool
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
        is_memory = "sqlite:///:memory:" in uri
        engine = create_engine(
            uri,
            connect_args={"check_same_thread": False} if "sqlite" in uri else {},
            poolclass=StaticPool if is_memory else None
        )
        SessionLocal.configure(bind=engine)
    Base.metadata.create_all(bind=engine)


def reset_db():
    global engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass

