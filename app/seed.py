from sqlalchemy.orm import Session

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


def seed_categories(db: Session, workspace_id: int) -> None:
    existing = {
        name
        for (name,) in db.query(Category.name)
        .filter(Category.workspace_id == workspace_id)
        .all()
    }
    new_categories = [
        Category(workspace_id=workspace_id, name=name)
        for name in DEFAULT_CATEGORIES
        if name not in existing
    ]
    if new_categories:
        db.add_all(new_categories)
        db.commit()
