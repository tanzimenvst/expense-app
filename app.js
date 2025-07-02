// Defines categories that belong to larger groups (Bills, Bazar)
const groupMap = {
  Bills: ["House", "Gas", "Electricity"],
  Bazar: ["Chal", "Fish/Meat", "Veg", "Grocery"],
  Shopping: ["Shopping"],
  Tour: ["Tour"],
  Self: ["Self"],
};

// Extracts year and month from a date string to create a unique month key (YYYY-MM)
function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.error("Invalid date string:", dateStr);
    return getMonthKey(new Date().toISOString()); // Fallback to current month
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Initializes the current month to the current date's month
let currentMonth = getMonthKey(new Date().toISOString());

// Global variable to track edit mode
let isEditMode = false;
let originalDataCopy = null; // To store a copy of data before edits for cancellation

// Format numbers in Indian/Bangladeshi style (#,##,###)
function formatNumber(num) {
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-BD', { maximumFractionDigits: 0 });
  return num < 0 ? `-${formatted}` : formatted;
}

// Format numbers with sign (+/-)
function formatNumberWithSign(num, showPositiveSign = false) {
  const formattedAbs = formatNumber(num).replace('-', '');
  if (num < 0) {
    return `-${formattedAbs}`;
  }
  return showPositiveSign ? `+${formattedAbs}` : formattedAbs;
}

// Sets the date input field to the current date
function updateDateInputToToday() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;
}

// Bills and bazar details toggle
document.getElementById("bills-group-summary").addEventListener("click", function() {
  document.getElementById("bills-details").classList.toggle("hidden");
});
document.getElementById("bazar-group-summary").addEventListener("click", function() {
  document.getElementById("bazar-details").classList.toggle("hidden");
});
document.getElementById("gross-group-summary").addEventListener("click", function() {
  document.getElementById("gross-details").classList.toggle("hidden");
});

// Delete expense item
function deleteItem(index) {
  const dataBeingEdited = originalDataCopy || JSON.parse(localStorage.getItem("expense_data") || "{}");
  if (!dataBeingEdited[currentMonth]) return;

  dataBeingEdited[currentMonth].expenses.splice(index, 1);
  originalDataCopy = JSON.parse(JSON.stringify(dataBeingEdited));

  renderItemsView(dataBeingEdited[currentMonth] || { allocations: {}, expenses: [] });
  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("items-view").classList.remove("hidden");
}

// Render editable expense items
function renderItemsView(monthData) {
  const section = document.getElementById("items-list");
  section.innerHTML = '<h5 class="mt-3 mb-2 text-center">Edit Expenses</h5>';

  const table = document.createElement("table");
  table.className = "table table-sm";

  const header = document.createElement("thead");
  header.innerHTML = "<tr><th>Date</th><th>Category</th><th>Amount</th><th>Delete</th></tr>";
  table.appendChild(header);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  monthData.expenses.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="date" class="form-control form-control-sm" style="width: 115px;" value="${entry.date}" data-edit-date="${index}" /></td>
      <td>${entry.category}</td>
      <td><input type="number" class="form-control form-control-sm" style="width: 80px;" value="${entry.amount}" data-edit-amount="${index}" /></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteItem(${index})">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
  section.appendChild(table);
}

// Update group totals live during editing
function updateGroupTotalsLive() {
  ["Bills", "Bazar"].forEach((group) => {
    const total = groupMap[group].reduce((sum, subcat) => {
      const input = document.querySelector(`[data-cat="${subcat}"]`);
      return sum + (parseFloat(input?.value || 0) || 0);
    }, 0);
    const field = document.getElementById(`readonly-${group}`);
    if (field) field.value = formatNumber(total);
  });

  // Define categories to sum for Gross Total
  const grossCategories = [
    // Bills and Bazar subcategories
    ...groupMap["Bills"],
    ...groupMap["Bazar"],
    // Other editable categories
    "Shopping",
    "Tour",
    "Self",
    // Extra categories
    "Future",
    "Savings",
    "Home",
    "Wifi"
  ];

  // Calculate Gross Total by summing values of all these categories
  const grossTotal = grossCategories.reduce((sum, cat) => {
    const input = document.querySelector(`[data-cat="${cat}"]`);
    return sum + (parseFloat(input?.value || 0) || 0);
  }, 0);

  // Update the Gross Total readonly input field
  const grossTotalField = document.getElementById("readonly-GrossTotal");
  if (grossTotalField) {
    grossTotalField.value = formatNumber(grossTotal);
  }
}

// Render allocation editing view
function renderAllowedView(monthData) {
  const section = document.getElementById("allowed-list");
  section.innerHTML = '<h5 class="text-center mb-2">Allowed Allocations</h5>';

  const table = document.createElement("table");
  table.className = "table table-sm";

  const header = document.createElement("thead");
  header.innerHTML = "<tr><th>Category</th><th>Allocation</th></tr>";
  table.appendChild(header);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // Editable categories split into parts: first "House", "Gas" and "Electricity"
  const firstCategories = ["House", "Gas", "Electricity"];
  // Bazar subcategories
  const bazarCategories = ["Chal", "Fish/Meat", "Veg", "Grocery"];
  // Other editable categories
  const otherCategories = ["Shopping", "Tour", "Self"];
  // Gross
  const extraCategories = ["Future", "Savings", "Home", "Wifi"];

  // Insert Bills group total row at the end (or wherever you want)
  const billsTotal = groupMap["Bills"].reduce(
    (sum, subcat) => sum + (parseFloat(monthData.allocations[subcat]) || 0),
    0
  );
  const billsRow = document.createElement("tr");
  billsRow.innerHTML = `
    <td class="fw-bold">Bills</td>
    <td><input type="text" class="form-control-plaintext form-control-sm" readonly id="readonly-Bills" value="${formatNumber(billsTotal)}"></td>
  `;
  tbody.appendChild(billsRow);

  // Render editable rows for firstCategories ("House", "Gas", "Electricity")
  firstCategories.forEach((cat) => {
    const value = monthData.allocations[cat] || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat}</td>
      <td><input type="number" class="form-control form-control-sm alloc-input" data-cat="${cat}" value="${value}"></td>
    `;
    tbody.appendChild(row);
  });

  // Insert Bazar group total row
  const bazarTotal = groupMap["Bazar"].reduce(
    (sum, subcat) => sum + (parseFloat(monthData.allocations[subcat]) || 0),
    0
  );
  const bazarRow = document.createElement("tr");
  bazarRow.innerHTML = `
    <td class="fw-bold">Bazar</td>
    <td><input type="text" class="form-control-plaintext form-control-sm" readonly id="readonly-Bazar" value="${formatNumber(bazarTotal)}"></td>
  `;
  tbody.appendChild(bazarRow);

  // Render editable rows for Bazar subcategories
  bazarCategories.forEach((cat) => {
    const value = monthData.allocations[cat] || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat}</td>
      <td><input type="number" class="form-control form-control-sm alloc-input" data-cat="${cat}" value="${value}"></td>
    `;
    tbody.appendChild(row);
  });

  // Render editable rows for other categories
  otherCategories.forEach((cat) => {
    const value = monthData.allocations[cat] || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat}</td>
      <td><input type="number" class="form-control form-control-sm alloc-input" data-cat="${cat}" value="${value}"></td>
    `;
    tbody.appendChild(row);
  });

  // Calculate sum of Shopping, Tour, Self
  const otherTotal = otherCategories.reduce(
    (sum, cat) => sum + (parseFloat(monthData.allocations[cat]) || 0),
    0
  );

  // Calculate sum of extra categories (Future, Savings, Home, Wifi)
  const extraTotal = extraCategories.reduce(
    (sum, cat) => sum + (parseFloat(monthData.allocations[cat]) || 0),
    0
  );

  // Calculate Gross Total = Bills + Bazar + Shopping + Tour + Self + Future + Savings + Home + Wifi
  const grossTotal = billsTotal + bazarTotal + otherTotal + extraTotal;

  // Insert Gross Total row (readonly)
  const grossRow = document.createElement("tr");
  grossRow.innerHTML = `
    <td class="fw-bold" style="min-width: 150px">Gross Total</td>
    <td><input type="text" class="form-control-plaintext form-control-sm" readonly id="readonly-GrossTotal" value="${formatNumber(grossTotal)}"></td>
  `;
  tbody.appendChild(grossRow);

  // Render editable rows for extra categories
  extraCategories.forEach((cat) => {
    const value = monthData.allocations[cat] || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat}</td>
      <td><input type="number" class="form-control form-control-sm alloc-input" data-cat="${cat}" value="${value}"></td>
    `;
    tbody.appendChild(row);
  });

  section.appendChild(table);
  updateGroupTotalsLive();
}

// Find the most recent month with defined allocations
function getLastDefinedAllocations(data, targetMonthKey) {
  let [targetYear, targetMonth] = targetMonthKey.split("-").map(Number);
  let tempDate = new Date(targetYear, targetMonth - 1, 1);

  for (let i = 0; i < 12 * 10; i++) {
    tempDate.setMonth(tempDate.getMonth() - 1);
    const prevMonthKey = getMonthKey(tempDate.toISOString());

    if (data[prevMonthKey] && Object.keys(data[prevMonthKey].allocations).length > 0) {
      return { ...data[prevMonthKey].allocations };
    }
    if (tempDate.getFullYear() < 2000) break;
  }
  return {};
}

// Calculate cumulative balance from previous months
function calculateBalanceForward(targetMonthKey) {
  const data = JSON.parse(localStorage.getItem("expense_data") || "{}");
  let cumulativeBalance = 0;

  const sortedMonthKeys = Object.keys(data).sort();

  for (const monthKey of sortedMonthKeys) {
    if (monthKey >= targetMonthKey) break;

    const monthData = data[monthKey];
    if (!monthData) continue;

    const summaryForMonth = {};
    monthData.expenses.forEach(({ category, amount }) => {
      summaryForMonth[category] = (summaryForMonth[category] || 0) + amount;
    });

    // Calculate regular spending (Bills + Bazar + Shopping + Tour + Self)
    const regularSpentForMonth = 
      groupMap["Bills"].reduce((sum, cat) => sum + (summaryForMonth[cat] || 0), 0) +
      groupMap["Bazar"].reduce((sum, cat) => sum + (summaryForMonth[cat] || 0), 0) +
      ["Shopping", "Tour", "Self"].reduce((sum, cat) => sum + (summaryForMonth[cat] || 0), 0);

    const extraSpentForMonth = summaryForMonth["Extra"] || 0;

    // Calculate allocation for only regular categories (excluding Future, Savings, etc.)
    const regularAllocationForMonth = 
      groupMap["Bills"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0) +
      groupMap["Bazar"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0) +
      ["Shopping", "Tour", "Self"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0);

    cumulativeBalance += regularAllocationForMonth - regularSpentForMonth - extraSpentForMonth;
  }
  return cumulativeBalance;
}

// Render group summary row
function renderGroup(id, cats, monthData, summary) {
  const div = document.getElementById(id);
  if (!div) return;

  const alloc = cats.reduce((sum, c) => sum + (monthData.allocations[c] || 0), 0);
  const spent = cats.reduce((sum, c) => sum + (summary[c] || 0), 0);
  const rem = alloc - spent;

  div.children[1].textContent = formatNumber(alloc);
  div.children[2].textContent = "-" + formatNumber(spent);
  div.children[3].textContent = formatNumberWithSign(rem, true);
  div.children[3].style.color = rem < 0 ? "red" : "green";
}

// Render single category row
function renderSingle(category, monthData, summary, elementId) {
  const div = document.getElementById(elementId);
  if (!div) return;

  const alloc = monthData.allocations[category] || 0;
  const spent = summary[category] || 0;
  const rem = alloc - spent;

  div.children[1].textContent = formatNumber(alloc);
  div.children[2].textContent = "-" + formatNumber(spent);

  div.children[3].textContent = formatNumberWithSign(rem, true);
  if (["house-row","gas-row", "electricity-row","chal-row","fish-meat-row","veg-row","grocery-row"].includes(elementId)) {
    div.children[3].style.color = "black";
  } else {
    div.children[3].style.color = rem < 0 ? "red" : "green";
  }
}

// Main rendering function
function isFutureMonth(monthKey) {
  const todayKey = getMonthKey(new Date().toISOString());
  return monthKey > todayKey;
}

function renderApp() {
  const data = JSON.parse(localStorage.getItem("expense_data") || "{}");
  let monthData = data[currentMonth];

  // Only inherit allocations if currentMonth is not in the future
  if (!monthData || Object.keys(monthData.allocations).length === 0) {
    if (isFutureMonth(currentMonth)) {
      if (!data[currentMonth]) data[currentMonth] = { expenses: [], allocations: {} };
      data[currentMonth].allocations = {}; // or set all categories to 0 if you prefer
    } else {
      const inheritedAllocations = getLastDefinedAllocations(data, currentMonth);
      if (!data[currentMonth]) data[currentMonth] = { expenses: [], allocations: {} };
      data[currentMonth].allocations = { ...inheritedAllocations };
    }
    localStorage.setItem("expense_data", JSON.stringify(data));
    monthData = data[currentMonth];
  }

  // Summarize expenses by category
  const summary = {};
  monthData.expenses.forEach(({ category, amount }) => {
    summary[category] = (summary[category] || 0) + amount;
  });

  // Calculate group totals for Bills, Bazar, etc.
  const groupTotals = {};
  for (const group in groupMap) {
    groupTotals[group] = groupMap[group].reduce(
      (sum, cat) => sum + (summary[cat] || 0),
      0
    );
  }

  // Define categories
  const extraCategories = ["Future", "Savings", "Home", "Wifi"];

  // Calculate Total Allocation = Bills + Bazar + Shopping + Tour + Self
  const totalAllocation = 
    groupMap["Bills"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0) +
    groupMap["Bazar"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0) +
    ["Shopping", "Tour", "Self"].reduce((sum, cat) => sum + (monthData.allocations[cat] || 0), 0);

  // Calculate Extra Total = Future + Savings + Home + Wifi
  const extraTotal = extraCategories.reduce(
    (sum, cat) => sum + (monthData.allocations[cat] || 0),
    0
  );

  // Gross Total = Total Allocation + Extra Total
  const grossTotal = totalAllocation + extraTotal;

  // Calculate balance forward and other totals
  const balanceForward = calculateBalanceForward(currentMonth);

  const totalSpentRegular = Object.values(groupTotals).reduce((a, b) => a + b, 0);
  const extraSpentCurrentMonth = summary["Extra"] || 0;
  const totalRemaining = totalAllocation - totalSpentRegular + balanceForward - extraSpentCurrentMonth;

  // Update UI - Current Month display
  const currentMonthElem = document.getElementById("current-month");
  if (currentMonthElem) {
    currentMonthElem.textContent = new Date(
      currentMonth + "-01"
    ).toLocaleString("en-BD", { month: "long", year: "numeric" });
  }

  // Update total summary UI (#total row)
  const totalDiv = document.getElementById("total");
  if (totalDiv) {
    // Update second column with Total Allocation
    if (totalDiv.children.length > 1) {
      totalDiv.children[1].textContent = formatNumber(totalAllocation);
    }
    // Update existing columns for overall allocation, spent, remaining
    if (totalDiv.children.length > 2) {
      totalDiv.children[2].textContent = "-" + formatNumber(totalSpentRegular);
    }
    if (totalDiv.children.length > 3) {
      totalDiv.children[3].textContent = formatNumberWithSign(totalRemaining, true);
      totalDiv.children[3].style.color = totalRemaining < 0 ? "red" : "green";
    }
  }

  // Update Gross Total display
  const grossTotalElem = document.getElementById("gross-total");
  if (grossTotalElem) {
    grossTotalElem.textContent = formatNumber(grossTotal);
  }

  // Update extra categories display
  extraCategories.forEach((cat) => {
    const elem = document.getElementById(cat.toLowerCase() + "-value");
    if (elem) {
      elem.textContent = formatNumber(monthData.allocations[cat] || 0);
    }
  });

  // Render groups and categories in main view
  renderGroup("bills-group-summary", ["House", "Gas", "Electricity"], monthData, summary);
  renderGroup("bazar-group-summary", ["Chal", "Fish/Meat", "Veg", "Grocery"], monthData, summary);

  renderSingle("House", monthData, summary, "house-row");
  renderSingle("Electricity", monthData, summary, "electricity-row");
  renderSingle("Gas", monthData, summary, "gas-row");
  renderSingle("Chal", monthData, summary, "chal-row");
  renderSingle("Fish/Meat", monthData, summary, "fish-meat-row");
  renderSingle("Veg", monthData, summary, "veg-row");
  renderSingle("Grocery", monthData, summary, "grocery-row");
  renderSingle("Shopping", monthData, summary, "shopping-row");
  renderSingle("Tour", monthData, summary, "tour-row");
  renderSingle("Self", monthData, summary, "self-row");

  // Handle edit mode toggle
  if (isEditMode) {
    document.getElementById("main-view").classList.add("hidden");
    document.getElementById("items-view").classList.remove("hidden");
    renderItemsView(monthData);
    renderAllowedView(monthData);
  } else {
    document.getElementById("main-view").classList.remove("hidden");
    document.getElementById("items-view").classList.add("hidden");
  }
}



function initializeCurrentMonthAllocations() {
  const data = JSON.parse(localStorage.getItem("expense_data") || "{}");
  const todayKey = getMonthKey(new Date().toISOString());

  if (
    !data[todayKey] ||
    !data[todayKey].allocations ||
    Object.keys(data[todayKey].allocations).length === 0
  ) {
    // Copy previous month's allocations (if any)
    const inheritedAllocations = getLastDefinedAllocations(data, todayKey);
    if (!data[todayKey]) data[todayKey] = { expenses: [], allocations: {} };
    data[todayKey].allocations = { ...inheritedAllocations };
    localStorage.setItem("expense_data", JSON.stringify(data));
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeCurrentMonthAllocations();
  updateDateInputToToday();
  renderApp();
});

document.getElementById("expense-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const monthKey = getMonthKey(date);

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  if (isEditMode && originalDataCopy) {
    if (!originalDataCopy[monthKey]) {
      originalDataCopy[monthKey] = { expenses: [], allocations: {} };
    }
    originalDataCopy[monthKey].expenses.push({ date, category, amount });
    // Re-render edit view
    renderItemsView(originalDataCopy[currentMonth]);
    renderAllowedView(originalDataCopy[currentMonth]);
  } else {
    const data = JSON.parse(localStorage.getItem("expense_data") || "{}");
    if (!data[monthKey]) {
      data[monthKey] = { expenses: [], allocations: {} };
    }
    data[monthKey].expenses.push({ date, category, amount });
    localStorage.setItem("expense_data", JSON.stringify(data));
    if (monthKey === currentMonth) renderApp();
  }
  this.reset();
  updateDateInputToToday();
});

document.getElementById("prev-month").addEventListener("click", () => {
  const [y, m] = currentMonth.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 2);
  currentMonth = getMonthKey(d.toISOString());
  renderApp();
});

document.getElementById("next-month").addEventListener("click", () => {
  const [y, m] = currentMonth.split("-");
  const d = new Date(parseInt(y), parseInt(m));
  currentMonth = getMonthKey(d.toISOString());
  renderApp();
});

document.getElementById("edit").addEventListener("click", function() {
  isEditMode = true;
  originalDataCopy = JSON.parse(localStorage.getItem("expense_data") || "{}");
  
  const monthDataForEdit = originalDataCopy[currentMonth] || {
    allocations: {},
    expenses: [],
  };

  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("items-view").classList.remove("hidden");
  renderItemsView(monthDataForEdit);
  renderAllowedView(monthDataForEdit);
});

document.addEventListener("input", (e) => {
  if (e.target.matches(".alloc-input")) updateGroupTotalsLive();
});

function goBack() {
  document.getElementById("items-view").classList.add("hidden");
  document.getElementById("main-view").classList.remove("hidden");
}

function cancelEdits() {
  originalDataCopy = null;
  isEditMode = false;
  goBack();
  renderApp();
}

function saveAllEdits() {
  const finalDataToSave = JSON.parse(JSON.stringify(originalDataCopy));

  // Update allocations
  if (!finalDataToSave[currentMonth]) {
    finalDataToSave[currentMonth] = { expenses: [], allocations: {} };
  }
  
  finalDataToSave[currentMonth].allocations = {};
  document.querySelectorAll("[data-cat]").forEach((input) => {
    const val = parseFloat(input.value) || 0;
    finalDataToSave[currentMonth].allocations[input.dataset.cat] = val;
  });

  // Update expenses
  const tempCurrentMonthExpenses = [];
  document.querySelectorAll("#items-list tbody tr").forEach((row) => {
    const dateInput = row.querySelector("[data-edit-date]");
    const amountInput = row.querySelector("[data-edit-amount]");
    const categoryCell = row.children[1];

    if (dateInput && amountInput && categoryCell) {
      tempCurrentMonthExpenses.push({
        date: dateInput.value,
        category: categoryCell.textContent,
        amount: parseFloat(amountInput.value) || 0,
      });
    }
  });

  // Clear and rebuild expenses
  finalDataToSave[currentMonth].expenses = [];
  tempCurrentMonthExpenses.forEach((entry) => {
    const mKey = getMonthKey(entry.date);
    if (!finalDataToSave[mKey]) {
      finalDataToSave[mKey] = { expenses: [], allocations: {} };
    }
    finalDataToSave[mKey].expenses.push(entry);
  });

  // Save and exit edit mode
  localStorage.setItem("expense_data", JSON.stringify(finalDataToSave));
  originalDataCopy = null;
  isEditMode = false;
  goBack();
  renderApp();
}



// Convert expense data to CSV format
function convertDataToCSV(data) {
  // Prepare CSV headers
  const headers = ["Month", "Date", "Category", "Amount"];
  const rows = [headers];

  for (const monthKey in data) {
    if (!data.hasOwnProperty(monthKey)) continue;

    const monthData = data[monthKey];
    if (!monthData.expenses || !Array.isArray(monthData.expenses)) continue;

    monthData.expenses.forEach(expense => {
      // Format each row as [Month, Date, Category, Amount]
      rows.push([
        monthKey,
        expense.date || "",
        expense.category || "",
        expense.amount != null ? expense.amount : ""
      ]);
    });
  }

  // Convert rows array to CSV string
  return rows.map(row => 
    row.map(field => {
      // Escape double quotes by doubling them
      const escaped = String(field).replace(/"/g, '""');
      // Wrap fields containing commas or quotes in double quotes
      if (escaped.search(/("|,|\n)/g) >= 0) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(",")
  ).join("\n");
}

// Download CSV file helper
function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Export CSV handler
function exportCSV() {
  const rawData = localStorage.getItem("expense_data") || "{}";
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    alert("Error parsing data for CSV export.");
    return;
  }

  const csvContent = convertDataToCSV(data);

  const now = new Date();
  const filename = `expense_data_export_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.csv`;

  downloadCSV(filename, csvContent);
}

// Attach event listener after DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  const exportCsvBtn = document.getElementById("export-csv-btn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportCSV);
  }
});
