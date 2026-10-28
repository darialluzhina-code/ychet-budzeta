"use strict";

const categories = {
  income: [
    "Зарплата",
    "Премия",
    "Подработка",
    "Бизнес",
    "Пенсия",
    "Аренда",
    "Подарки",
    "Прочие доходы"
  ],
  expense: [
    "Продукты",
    "Кафе и рестораны",
    "Жилье",
    "Коммунальные услуги",
    "Транспорт",
    "Автомобиль",
    "Здоровье",
    "Образование",
    "Дети",
    "Животные",
    "Одежда",
    "Красота",
    "Развлечения",
    "Путешествия",
    "Кредиты",
    "Подарки",
    "Накопления",
    "Прочие расходы"
  ]
};

const STORAGE_KEY = "family_budget_v1";
const LIMIT_KEY = "family_budget_limits_v1";

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch (error) {
    console.warn("Ошибка чтения данных:", error);
    return fallback;
  }
}

let operations = readStorage(STORAGE_KEY, []);
let limits = readStorage(LIMIT_KEY, {});

if (!Array.isArray(operations)) operations = [];
if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
  limits = {};
}

let editingId = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    return true;
  } catch (error) {
    alert("Не удалось сохранить данные в браузере.");
    return false;
  }
}

function saveLimits() {
  try {
    localStorage.setItem(LIMIT_KEY, JSON.stringify(limits));
  } catch (error) {
    alert("Не удалось сохранить лимит.");
  }
}

const $ = (id) => document.getElementById(id);

const monthInput = $("month");
const dateInput = $("date");
const typeInput = $("type");
const amountInput = $("amount");
const categoryInput = $("category");
const commentInput = $("comment");
const limitInput = $("limit");
const filterInput = $("filter");
const form = $("operationForm");

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function money(value) {
  return moneyFormatter.format(value);
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function todayLocal() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function makeId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function updateCategories(selected = "") {
  categoryInput.replaceChildren();

  const list = categories[typeInput.value];

  if (selected && !list.includes(selected)) {
    list.push(selected);
  }

  list.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  if (selected) categoryInput.value = selected;
}

typeInput.addEventListener("change", () => {
  updateCategories();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(amountInput.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Введите сумму больше нуля.");
    return;
  }

  if (!dateInput.value || !categoryInput.value) {
    alert("Заполните обязательные поля.");
    return;
  }

  const operation = {
    id: editingId || makeId(),
    type: typeInput.value,
    amount: roundMoney(amount),
    category: categoryInput.value,
    date: dateInput.value,
    comment: commentInput.value.trim()
  };

  const oldOperations = [...operations];

  if (editingId) {
    operations = operations.map((item) =>
      item.id === editingId ? operation : item
    );
  } else {
    operations.push(operation);
  }

  if (!saveData()) {
    operations = oldOperations;
    return;
  }

  resetForm();
  monthInput.value = operation.date.slice(0, 7);
  render();
});

function resetForm() {
  editingId = null;
  form.reset();
  typeInput.value = "expense";
  dateInput.value = todayLocal();
  updateCategories();
  $("saveBtn").textContent = "Добавить операцию";
  $("cancelBtn").hidden = true;
}

$("cancelBtn").addEventListener("click", resetForm);

function editOperation(id) {
  const item = operations.find((op) => op.id === id);
  if (!item) return;

  editingId = id;
  typeInput.value = item.type;
  updateCategories(item.category);
  amountInput.value = item.amount;
  dateInput.value = item.date;
  commentInput.value = item.comment || "";

  $("saveBtn").textContent = "Сохранить изменения";
  $("cancelBtn").hidden = false;

  form.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function deleteOperation(id) {
  if (!confirm("Удалить эту операцию?")) return;

  const oldOperations = [...operations];
  operations = operations.filter((op) => op.id !== id);

  if (!saveData()) {
    operations = oldOperations;
    return;
  }

  if (editingId === id) resetForm();
  render();
}

function getMonthlyOperations() {
  return operations.filter((item) => item.date.slice(0, 7) === monthInput.value);
}

function sumByType(items, type) {
  return roundMoney(
    items
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + Number(item.amount), 0)
  );
}

function renderStats(items) {
  const income = sumByType(items, "income");
  const expense = sumByType(items, "expense");
  const balance = roundMoney(income - expense);

  $("totalIncome").textContent = money(income);
  $("totalExpense").textContent = money(expense);
  $("balance").textContent = money(balance);

  $("balance").className = balance >= 0 ? "green" : "red";

  return { income, expense, balance };
}

function renderLimit(expense) {
  const month = monthInput.value;
  const limit = Number(limits[month]) || 0;

  limitInput.value = limit > 0 ? limit : "";

  const fill = $("progressFill");
  const info = $("limitInfo");

  if (limit <= 0) {
    fill.style.width = "0%";
    info.textContent = "Установите лимит расходов.";
    return;
  }

  const percent = (expense / limit) * 100;
  fill.style.width = Math.min(percent, 100) + "%";

  if (percent >= 100) {
    fill.style.background = "var(--expense)";
  } else if (percent >= 80) {
    fill.style.background = "#e8a23c";
  } else {
    fill.style.background = "var(--primary)";
  }

  if (expense > limit) {
    info.textContent =
      `Лимит превышен на ${money(expense - limit)} ` +
      `(${percent.toFixed(1)}% использовано).`;
  } else {
    info.textContent =
      `Использовано ${percent.toFixed(1)}%. ` +
      `Осталось ${money(limit - expense)}.`;
  }
}

limitInput.addEventListener("change", () => {
  const value = Number(limitInput.value);

  if (!Number.isFinite(value) || value < 0) {
    alert("Лимит не может быть отрицательным.");
    return;
  }

  limits[monthInput.value] = roundMoney(value);
  saveLimits();
  renderLimit(sumByType(getMonthlyOperations(), "expense"));
});

function renderChart(items) {
  const chart = $("chart");
  chart.replaceChildren();

  const expenseItems = items.filter((item) => item.type === "expense");
  const totals = {};

  expenseItems.forEach((item) => {
    totals[item.category] = roundMoney(
      (totals[item.category] || 0) + Number(item.amount)
    );
  });

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Пока нет расходов за этот месяц.";
    chart.appendChild(empty);
    return;
  }

  const max = entries[0][1];
  const total = entries.reduce((sum, item) => sum + item[1], 0);

  const colors = [
    "#4965dc", "#16a085", "#f0a23a",
    "#a36add", "#e36a7a", "#3498db",
    "#7d9b42", "#d17c42"
  ];

  entries.forEach(([name, amount], index) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-name";
    label.textContent = name;

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.width = (amount / max) * 100 + "%";
    bar.style.background = colors[index % colors.length];
    bar.title = ((amount / total) * 100).toFixed(1) + "%";

    const value = document.createElement("div");
    value.className = "chart-value";
    value.textContent = money(amount);

    track.appendChild(bar);
    row.append(label, track, value);
    chart.appendChild(row);
  });
}

function renderTable(items) {
  const body = $("operationsBody");
  body.replaceChildren();

  const filtered = items
    .filter(
      (item) =>
        filterInput.value === "all" || item.type === filterInput.value
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  $("operationCount").textContent = `Операций: ${filtered.length}`;

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "Операций пока нет.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement("tr");

    function cell(value) {
      const td = document.createElement("td");
      td.textContent = value;
      return td;
    }

    tr.appendChild(cell(formatDate(item.date)));
    tr.appendChild(cell(item.type === "income" ? "Доход" : "Расход"));
    tr.appendChild(cell(item.category));
    tr.appendChild(cell(item.comment || "—"));

    const amountCell = cell(
      (item.type === "income" ? "+ " : "− ") + money(item.amount)
    );

    amountCell.className = item.type === "income" ? "green" : "red";
    tr.appendChild(amountCell);

    const actionCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.className = "small secondary";
    editBtn.textContent = "Изменить";
    editBtn.addEventListener("click", () => editOperation(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "small danger";
    deleteBtn.textContent = "Удалить";
    deleteBtn.addEventListener("click", () => deleteOperation(item.id));

    actionCell.append(editBtn, deleteBtn);
    tr.appendChild(actionCell);
    body.appendChild(tr);
  });
}

function render() {
  const items = getMonthlyOperations();
  const stats = renderStats(items);

  renderLimit(stats.expense);
  renderChart(items);
  renderTable(items);
}

monthInput.addEventListener("change", render);
filterInput.addEventListener("change", render);

function csvCell(value) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

$("exportBtn").addEventListener("click", () => {
  const items = getMonthlyOperations();

  if (items.length === 0) {
    alert("Нет операций для экспорта за выбранный месяц.");
    return;
  }

  const rows = [
    ["Дата", "Тип", "Категория", "Комментарий", "Сумма, руб."]
  ];

  items.forEach((item) => {
    rows.push([
      formatDate(item.date),
      item.type === "income" ? "Доход" : "Расход",
      item.category,
      item.comment || "",
      item.type === "income" ? item.amount : -item.amount
    ]);
  });

  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `семейный-бюджет-${monthInput.value}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("clearBtn").addEventListener("click", () => {
  const confirmed = confirm(
    "Удалить ВСЕ операции и лимиты за ВСЕ месяцы? " +
    "Это действие нельзя отменить."
  );

  if (!confirmed) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LIMIT_KEY);
    operations = [];
    limits = {};
    resetForm();
    render();
  } catch (error) {
    alert("Не удалось очистить данные.");
  }
});

function init() {
  const today = todayLocal();

  monthInput.value = today.slice(0, 7);
  dateInput.value = today;

  updateCategories();
  render();
}

init();
