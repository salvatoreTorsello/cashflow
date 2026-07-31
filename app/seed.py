from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Category

DEFAULT_CATEGORIES = [
    "balance",
    "salary",
    "house",
    "taxes",
    "insurance",
    "car",
    "transport",
    "trip",
    "education",
    "gifts",
    "other",
]


def seed_categories(db: Session) -> None:
    existing = {name for (name,) in db.query(Category.name).all()}
    new_categories = [
        Category(name=name)
        for name in DEFAULT_CATEGORIES
        if name not in existing
    ]
    if new_categories:
        db.add_all(new_categories)
        db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()
