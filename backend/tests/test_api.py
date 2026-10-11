def create(client, **values):
    payload = {"type": "expense", "amount": "125.50", "category": "Food",
               "description": "Groceries", "transaction_date": "2025-02-10"}
    payload.update(values)
    return client.post("/api/transactions", json=payload)


def test_health_and_empty_dashboard(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    result = client.get("/api/dashboard/summary").json()
    assert result["balance_minor"] == result["total_income_minor"] == result["total_expenses_minor"] == 0
    assert result["transaction_count"] == 0
    assert client.get("/api/dashboard/category-breakdown").json() == []


def test_crud_and_aggregates(client):
    income = create(client, type="income", amount="2500.00", category="Salary", description="Payday")
    expense = create(client)
    assert income.status_code == 201 and income.json()["amount"] == "2500.00"
    assert expense.status_code == 201
    assert client.get("/api/transactions?search=grocer&category=Food").json()["total"] == 1
    assert client.get("/api/transactions?limit=1&offset=1").json()["total"] == 2
    summary = client.get("/api/dashboard/summary").json()
    assert (summary["total_income_minor"], summary["total_expenses_minor"], summary["balance_minor"]) == (250000, 12550, 237450)
    assert client.get("/api/dashboard/category-breakdown").json() == [{"category": "Food", "total_minor": 12550}]
    updated = client.patch(f"/api/transactions/{expense.json()['id']}", json={"amount": "100.00"})
    assert updated.status_code == 200
    assert client.get("/api/dashboard/summary").json()["total_expenses_minor"] == 10000
    assert client.delete(f"/api/transactions/{income.json()['id']}").status_code == 204
    assert client.get("/api/dashboard/summary").json()["total_income_minor"] == 0
    assert client.get(f"/api/transactions/{income.json()['id']}").status_code == 404


def test_validation_and_date_filters(client):
    for amount in ["0", "-1", "1.001"]:
        assert create(client, amount=amount).status_code == 422
    assert create(client, category="Salary").status_code == 422
    assert create(client, type="other").status_code == 422
    create(client, transaction_date="2025-02-10")
    create(client, transaction_date="2025-03-10", description="Bus fare", category="Transport")
    assert client.get("/api/transactions?start_date=2025-02-01&end_date=2025-02-28").json()["total"] == 1
    assert client.get("/api/transactions?start_date=2025-04-01&end_date=2025-01-01").status_code == 422


def test_monthly_summary_returns_twelve_months(client):
    create(client, type="income", amount="1.25", category="Freelance", transaction_date="2025-02-10")
    months = client.get("/api/dashboard/monthly-summary?year=2025").json()
    assert len(months) == 12 and months[1]["income_minor"] == 125
    assert months[1]["expenses_minor"] == 0
