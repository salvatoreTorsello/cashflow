"""add is_active flag to commitment series

Revision ID: 0d583c65dcf6
Revises: 2eb3e0c20fcc
Create Date: 2026-08-02 23:31:18.911349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d583c65dcf6'
down_revision: Union[str, None] = '2eb3e0c20fcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "commitment_series",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("commitment_series", "is_active")
