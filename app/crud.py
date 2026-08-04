import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas


## Users


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, email: str, hashed_password: str) -> models.User:
    db_obj = models.User(email=email, hashed_password=hashed_password)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


## Sessions


def create_session(
    db: Session, user_id: int, token_hash: str, expires_at: datetime
) -> models.UserSession:
    db_obj = models.UserSession(
        user_id=user_id, token_hash=token_hash, expires_at=expires_at
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_session(db: Session, token_hash: str) -> None:
    db.query(models.UserSession).filter(
        models.UserSession.token_hash == token_hash
    ).delete()
    db.commit()


## Workspaces


def create_workspace(db: Session, owner_id: int, name: str) -> models.Workspace:
    db_obj = models.Workspace(owner_id=owner_id, name=name)
    db.add(db_obj)
    db.flush()
    db.add(models.WorkspaceMember(workspace_id=db_obj.id, user_id=owner_id))
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_workspaces(db: Session, user_id: int):
    return (
        db.query(models.Workspace)
        .join(
            models.WorkspaceMember,
            models.WorkspaceMember.workspace_id == models.Workspace.id,
        )
        .filter(models.WorkspaceMember.user_id == user_id)
        .order_by(models.Workspace.created_at)
        .all()
    )


def get_workspace_for_member(db: Session, workspace_id: int, user_id: int):
    return (
        db.query(models.Workspace)
        .join(
            models.WorkspaceMember,
            models.WorkspaceMember.workspace_id == models.Workspace.id,
        )
        .filter(
            models.Workspace.id == workspace_id,
            models.WorkspaceMember.user_id == user_id,
        )
        .first()
    )


def rename_workspace(db: Session, workspace: models.Workspace, name: str):
    workspace.name = name
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace: models.Workspace) -> None:
    db.delete(workspace)
    db.commit()


## Workspace invites


def create_invite(db: Session, workspace_id: int, code_hash: str, expires_at: datetime):
    # Only one active invite per workspace — generating a new one replaces
    # any still-pending old one, so there's a single unambiguous code (and
    # countdown) in the UI at any time.
    db.query(models.WorkspaceInvite).filter(
        models.WorkspaceInvite.workspace_id == workspace_id
    ).delete()
    invite = models.WorkspaceInvite(
        workspace_id=workspace_id, code_hash=code_hash, expires_at=expires_at
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def get_active_invite(db: Session, workspace_id: int):
    invite = (
        db.query(models.WorkspaceInvite)
        .filter(models.WorkspaceInvite.workspace_id == workspace_id)
        .first()
    )
    if invite is None:
        return None
    if invite.expires_at < datetime.now(timezone.utc):
        db.delete(invite)
        db.commit()
        return None
    return invite


def redeem_invite(db: Session, code_hash: str, user_id: int):
    invite = (
        db.query(models.WorkspaceInvite)
        .filter(models.WorkspaceInvite.code_hash == code_hash)
        .first()
    )
    if invite is None:
        return None
    if invite.expires_at < datetime.now(timezone.utc):
        db.delete(invite)
        db.commit()
        return None

    workspace = (
        db.query(models.Workspace)
        .filter(models.Workspace.id == invite.workspace_id)
        .first()
    )
    already_member = (
        db.query(models.WorkspaceMember)
        .filter(
            models.WorkspaceMember.workspace_id == invite.workspace_id,
            models.WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if not already_member:
        db.add(models.WorkspaceMember(workspace_id=invite.workspace_id, user_id=user_id))
    db.delete(invite)
    db.commit()
    return workspace


## Categories


def create_category(db: Session, workspace_id: int, obj: schemas.CategoryCreate):
    db_obj = models.Category(workspace_id=workspace_id, **obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_categories(db: Session, workspace_id: int):
    return (
        db.query(models.Category)
        .filter(models.Category.workspace_id == workspace_id)
        .order_by(models.Category.name)
        .all()
    )


def get_category(db: Session, workspace_id: int, category_id: int):
    return (
        db.query(models.Category)
        .filter(
            models.Category.id == category_id,
            models.Category.workspace_id == workspace_id,
        )
        .first()
    )


def get_category_by_name(db: Session, workspace_id: int, name: str):
    return (
        db.query(models.Category)
        .filter(
            models.Category.name == name,
            models.Category.workspace_id == workspace_id,
        )
        .first()
    )


## Transactions


def create_transaction(
    db: Session, workspace_id: int, obj: schemas.TransactionCreate
):
    db_obj = models.Transaction(workspace_id=workspace_id, **obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_transactions(db: Session, workspace_id: int):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.workspace_id == workspace_id)
        .order_by(models.Transaction.date.desc())
        .all()
    )


def edit_transaction(
    db: Session, workspace_id: int, transaction_id: int, obj: schemas.TransactionUpdate
):
    db_obj = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    for field, value in obj.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    # In case transaction was linked to a commitment, amount should be <= 0
    if db_obj.commitment_id is not None and db_obj.amount >= 0:
        raise ValueError("amount must be negative when linked to a commitment")

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_transaction(db: Session, workspace_id: int, transaction_id: int):
    db_obj = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    db.delete(db_obj)
    db.commit()
    return True


## Commitments


def _add_interval(d: date, count: int, unit: models.IntervalUnit) -> date:
    if unit == models.IntervalUnit.day:
        return d + timedelta(days=count)
    if unit == models.IntervalUnit.week:
        return d + timedelta(weeks=count)
    if unit == models.IntervalUnit.month:
        return _add_months(d, count)
    if unit == models.IntervalUnit.year:
        return _add_months(d, count * 12)
    raise ValueError(f"unknown interval unit: {unit}")


def create_commitment(
    db: Session, workspace_id: int, obj: schemas.CommitmentCreate
) -> list[models.Commitment]:
    if obj.type == models.CommitmentType.one_time:
        db_obj = models.Commitment(
            workspace_id=workspace_id,
            due_date=obj.due_date,
            amount=obj.amount,
            category_id=obj.category_id,
            description=obj.description,
            status=obj.status,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return [db_obj]

    if obj.type == models.CommitmentType.periodic:
        series = models.CommitmentSeries(
            workspace_id=workspace_id,
            type=models.CommitmentType.periodic,
            interval_count=obj.interval_count,
            interval_unit=obj.interval_unit,
        )
        db.add(series)
        db.flush()

        # Materialize occurrences covering the next year; one more gets
        # appended each time an occurrence is executed (see execute_commitment).
        # Exclusive upper bound: a monthly series starting Aug 5 should
        # produce 12 occurrences (through next Jul 5), not 13 (through next
        # Aug 5) — the anniversary date itself belongs to "year two".
        horizon = _add_months(obj.due_date, 12)
        occurrences = []
        i = 0
        # Each occurrence is computed fresh from the original anchor date
        # (i intervals forward), not incrementally from the previous
        # occurrence — otherwise a short month that clamps the day (e.g. Jan
        # 31 -> Feb 28) permanently loses the original day for every
        # subsequent month, instead of recovering it (e.g. -> Mar 31).
        current = _add_interval(obj.due_date, obj.interval_count * i, obj.interval_unit)
        while current < horizon:
            occurrences.append(
                models.Commitment(
                    workspace_id=workspace_id,
                    due_date=current,
                    amount=obj.amount,
                    category_id=obj.category_id,
                    description=obj.description,
                    status=models.CommitmentStatus.pending,
                    series_id=series.id,
                )
            )
            i += 1
            current = _add_interval(obj.due_date, obj.interval_count * i, obj.interval_unit)

        db.add_all(occurrences)
        db.commit()
        for occ in occurrences:
            db.refresh(occ)
        return occurrences

    if obj.type == models.CommitmentType.installment:
        series = models.CommitmentSeries(
            workspace_id=workspace_id,
            type=models.CommitmentType.installment,
            interval_count=obj.interval_count,
            interval_unit=obj.interval_unit,
            total_installments=obj.total_installments,
        )
        db.add(series)
        db.flush()

        occurrences = []
        total = obj.total_installments
        # Same fresh-from-anchor computation as the periodic branch above —
        # avoids permanently losing the original day after a short month.
        for idx, amount in enumerate(obj.installment_amounts):
            i = idx + 1
            current = _add_interval(obj.due_date, obj.interval_count * idx, obj.interval_unit)
            occurrences.append(
                models.Commitment(
                    workspace_id=workspace_id,
                    due_date=current,
                    amount=amount,
                    category_id=obj.category_id,
                    description=f"{obj.description} {i}/{total}",
                    status=models.CommitmentStatus.pending,
                    series_id=series.id,
                    installment_number=i,
                )
            )

        db.add_all(occurrences)
        db.commit()
        for occ in occurrences:
            db.refresh(occ)
        return occurrences

    raise ValueError(f"unknown commitment type: {obj.type}")


def get_commitments(
    db: Session, workspace_id: int, status: models.CommitmentStatus | None = None
):
    q = db.query(models.Commitment).filter(
        models.Commitment.workspace_id == workspace_id
    )
    if status:
        q = q.filter(models.Commitment.status == status)
    return q.order_by(models.Commitment.due_date).all()


def edit_commitment(
    db: Session, workspace_id: int, commitment_id: int, obj: schemas.CommitmentUpdate
):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    for field, value in obj.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def execute_commitment(
    db: Session,
    workspace_id: int,
    commitment_id: int,
    obj: schemas.CommitmentExecute | None = None,
):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj or db_obj.status == models.CommitmentStatus.paid:
        return None

    tx = models.Transaction(
        workspace_id=workspace_id,
        date=obj.date if obj and obj.date else date.today(),
        amount=obj.amount if obj and obj.amount is not None else db_obj.amount,
        category_id=db_obj.category_id,
        description=obj.description if obj and obj.description is not None else db_obj.description,
        commitment_id=db_obj.id,
    )
    db_obj.status = models.CommitmentStatus.paid
    db.add(tx)

    if db_obj.series_id is not None:
        series = (
            db.query(models.CommitmentSeries)
            .filter(models.CommitmentSeries.id == db_obj.series_id)
            .first()
        )
        if series and series.type == models.CommitmentType.periodic and series.is_active:
            anchor_date = (
                db.query(func.min(models.Commitment.due_date))
                .filter(models.Commitment.series_id == series.id)
                .scalar()
            )
            max_due_date = (
                db.query(func.max(models.Commitment.due_date))
                .filter(models.Commitment.series_id == series.id)
                .scalar()
            )
            # Fresh from the series' original anchor date each time, not
            # incrementally from max_due_date — otherwise a short month that
            # clamped the day (e.g. Jan 31 -> Feb 28) would never recover it
            # in a later, longer month (e.g. -> Mar 31).
            i = 1
            next_due = _add_interval(anchor_date, series.interval_count * i, series.interval_unit)
            while next_due <= max_due_date:
                i += 1
                next_due = _add_interval(anchor_date, series.interval_count * i, series.interval_unit)
            db.add(
                models.Commitment(
                    workspace_id=workspace_id,
                    due_date=next_due,
                    amount=db_obj.amount,
                    category_id=db_obj.category_id,
                    description=db_obj.description,
                    status=models.CommitmentStatus.pending,
                    series_id=series.id,
                )
            )

    db.commit()
    db.refresh(tx)
    return tx


def delete_commitment(
    db: Session, workspace_id: int, commitment_id: int, scope: str = "single"
):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    ids_to_delete = {db_obj.id}

    if scope == "series" and db_obj.series_id is not None:
        siblings = (
            db.query(models.Commitment.id)
            .filter(
                models.Commitment.series_id == db_obj.series_id,
                models.Commitment.due_date >= db_obj.due_date,
                models.Commitment.status != models.CommitmentStatus.paid,
            )
            .all()
        )
        ids_to_delete.update(s.id for s in siblings)

        # Stop future replenishment — otherwise paying an older, still-pending
        # occurrence left before this cutoff would silently resurrect the
        # series the user just cancelled.
        db.query(models.CommitmentSeries).filter(
            models.CommitmentSeries.id == db_obj.series_id
        ).update({"is_active": False})

    db.query(models.Transaction).filter(
        models.Transaction.commitment_id.in_(ids_to_delete)
    ).update({"commitment_id": None}, synchronize_session=False)

    db.query(models.Commitment).filter(models.Commitment.id.in_(ids_to_delete)).delete(
        synchronize_session=False
    )
    db.commit()
    return True


def get_next_commitment(db: Session, workspace_id: int):
    return (
        db.query(models.Commitment)
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status == models.CommitmentStatus.pending,
        )
        .order_by(models.Commitment.due_date)
        .first()
    )


def get_pending_commitments_total(db: Session, workspace_id: int):
    result = (
        db.query(func.sum(models.Commitment.amount))
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status == models.CommitmentStatus.pending,
        )
        .scalar()
    )
    return result or Decimal("0")


## Balance


def get_balance(db: Session, workspace_id: int):
    result = (
        db.query(func.sum(models.Transaction.amount))
        .filter(models.Transaction.workspace_id == workspace_id)
        .scalar()
    )
    return result or Decimal("0")


## Predictions


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def get_average_salary(db: Session, workspace_id: int) -> Decimal:
    amounts = (
        db.query(models.Transaction.amount)
        .join(models.Category)
        .filter(
            models.Transaction.workspace_id == workspace_id,
            models.Category.name == "salary",
        )
        .all()
    )
    values = [row[0] for row in amounts]
    if not values:
        return Decimal("0")
    return sum(values) / len(values)


def _get_last_salary_date(db: Session, workspace_id: int):
    return (
        db.query(func.max(models.Transaction.date))
        .join(models.Category)
        .filter(
            models.Transaction.workspace_id == workspace_id,
            models.Category.name == "salary",
        )
        .scalar()
    )


def _get_projected_salary_dates(
    db: Session, workspace_id: int, today: date, horizon_end: date
) -> list[date]:
    last_salary_date = _get_last_salary_date(db, workspace_id)
    if last_salary_date is None:
        # No salary history to anchor the recurrence to (e.g. a manual
        # average-salary override with no real salary transactions yet) —
        # assume a default monthly payday on the 28th, valid in every month
        # including February, so no month-end clamping is needed.
        last_salary_date = date(today.year, today.month, 28)

    next_date = last_salary_date
    while next_date <= today:
        next_date = _add_months(next_date, 1)

    dates = []
    while next_date <= horizon_end:
        dates.append(next_date)
        next_date = _add_months(next_date, 1)
    return dates


def get_prediction(
    db: Session,
    workspace_id: int,
    target_date: date | None = None,
    months: int = 5,
    average_salary_override: Decimal | None = None,
):
    today = date.today()
    horizon_end = _add_months(today, months)
    query_end = max(horizon_end, target_date) if target_date else horizon_end

    current_balance = get_balance(db, workspace_id)
    avg_salary = (
        average_salary_override
        if average_salary_override is not None
        else get_average_salary(db, workspace_id)
    )

    pending_commitments = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status != models.CommitmentStatus.paid,
            models.Commitment.due_date <= query_end,
        )
        .all()
    )
    salary_dates = _get_projected_salary_dates(db, workspace_id, today, query_end)

    def balance_at(d: date) -> Decimal:
        commitments_delta = sum(
            (c.amount for c in pending_commitments if c.due_date <= d), Decimal("0")
        )
        salary_delta = avg_salary * len([s for s in salary_dates if s <= d])
        return current_balance + commitments_delta + salary_delta

    series = []
    d = today
    while d <= horizon_end:
        series.append({"date": d, "balance": balance_at(d)})
        d += timedelta(days=7)

    selected = {"date": target_date, "balance": balance_at(target_date)} if target_date else None

    return {"average_salary": avg_salary, "series": series, "selected": selected}
