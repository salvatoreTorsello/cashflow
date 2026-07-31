---
layout: default
title: User Guide
---

# CashFlow User Guide

## Overview

CashFlow is a personal finance tool intended for individuals who manage their liquidity through a top-down approach. Instead of recording every micro-expense—such as a coffee, a ride-share, or an online purchase—it tracks the macro structure of your cash position: what you own today, what you have already decided to pay in the future, and what remains truly available for discretionary spending.

The tool is built around three core ideas:

1. **Balance-first tracking:** your current cash position is the source of truth.
2. **Manual income recording:** salaries and inflows are logged when they actually arrive, never simulated.
3. **Obligation-driven visibility:** future payments are tracked as *commitments* that are promoted to *transactions* only when confirmed.

This approach eliminates the noise of daily bookkeeping while preserving full awareness of your financial constraints.

## Core Concepts

### Opening Balance
The starting point is a single transaction representing your liquid cash today. Every subsequent movement either adds to or subtracts from this value.

### Income
Income entries are created manually after funds are received. Because amounts vary due to bonuses, overtime, or irregular payments, the system does not project or accrue salaries. This ensures the balance is always grounded in reality.

### Commitments
A commitment is a future payment you have already decided to make. Examples include loan installments, renovation installments, scheduled taxes, or a planned trip deposit. Each commitment carries a due date and an amount. Until you confirm it, the commitment occupies part of your *safe margin* without altering your current balance.

Commitments may be grouped by a `parent_id` to represent multi-installment plans (e.g., eleven facade installments).

### Transactions
A transaction is an executed movement that has already hit your account. It can be created directly (for an unplanned expense or an income) or generated automatically when a commitment is promoted.

### Safe Margin
The central indicator of the system. It is calculated as:

```
Safe Margin = Current Balance + Total Pending Commitments
```

Because pending commitments are stored as negative amounts, the Safe Margin represents the cash you can still spend freely without touching money already earmarked for future obligations. It is the only number you need to consult before a discretionary purchase.

## Workflow

### 1. Initialize your balance
Create a single transaction with your current cash holdings. This is your baseline.

### 2. Register future commitments
Enter every upcoming obligation you are aware of: the remaining installments of a renovation, a tax deadline, an insurance renewal. Set the status to `pending`.

### 3. Record income as it arrives
When your salary is credited, create an income transaction. The balance updates immediately.

### 4. Confirm commitments when due
When a commitment reaches its due date, the system can prompt you. Upon confirmation, the commitment is promoted to a transaction: the balance decreases, the commitment status changes to `paid`, and the safe margin is recalculated.

## Usage Scenarios

### Scenario A — Standard operations
Marco opens his balance with €4,500. He records four pending commitments: a specialization course (€200 × 4 remaining installments), a trip to Lisbon (€600 in October), property tax (€380 in December), and a Christmas gift (€150 in December). Total pending commitments: €1,330.

His safe margin is €3,170. Marco knows he can spend up to that amount on groceries, transport, entertainment, and incidental purchases without any further tracking. He simply checks the safe margin before any major unplanned expense.

### Scenario B — Unplanned expense
In September, Marco breaks his phone. The repair costs €180. He records it directly as a transaction. His balance drops by €180, and the safe margin drops by the same amount. No prior commitment existed, but the macro view is instantly updated. He sees that his free cash is now lower and can adjust accordingly.

### Scenario C — Delayed income
Marco’s October salary is delayed by ten days. The 1st of November brings a €200 course installment. Because the balance already contains the September salary, it can absorb the delay without breaking the commitment schedule. When the salary eventually arrives on 10 November, Marco records it, and the safe margin recovers. No emergency mode is needed because the balance itself acts as a buffer.

## Why this approach works

CashFlow does not attempt to predict exact cash-flow dates. It relies on the buffer inherent in your current balance. As long as your opening balance is realistic and you record income promptly, the safe margin is always a reliable indicator of your financial freedom. Daily spending is not tracked because it is already captured by the difference between your expected balance and your actual balance at the end of the month.

This tool is designed for people who want to know whether they can afford something—not where every cent went.
