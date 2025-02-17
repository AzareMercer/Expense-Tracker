document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transaction-form');
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const transactionBody = document.getElementById('transaction-body');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netSavingsEl = document.getElementById('net-savings');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    let barChart, donutChart;

    function saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function addTransaction(description, amount, category, date, currency) {
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid positive number for the amount.');
            return;
        }
        const transaction = { id: transactions.length + 1, description, amount: parseFloat(amount), category, date, currency };
        transactions.push(transaction);
        saveTransactions();
        renderTransactions();
        updateSummary();
        renderCharts();
    }

    function renderTransactions() {
        transactionBody.innerHTML = '';
        transactions.forEach((transaction, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.id}</td>
                <td>${transaction.description}</td>
                <td>${transaction.amount} ${transaction.currency}</td>
                <td>${transaction.category}</td>
                <td>${transaction.date}</td>
                <td>${transaction.currency}</td>
                <td><button class="delete-btn" data-index="${index}">Delete</button></td>
            `;
            transactionBody.appendChild(row);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                deleteTransaction(index);
            });
        });
    }

    function deleteTransaction(index) {
        transactions.splice(index, 1);
        saveTransactions();
        renderTransactions();
        updateSummary();
        renderCharts();
    }

    function updateSummary() {
        const totalIncome = transactions.filter(t => t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
        const netSavings = totalIncome - totalExpenses;

        totalIncomeEl.textContent = totalIncome.toFixed(2);
        totalExpensesEl.textContent = totalExpenses.toFixed(2);
        netSavingsEl.textContent = netSavings.toFixed(2);
    }

    function renderCharts() {
        const expenseData = transactions.filter(t => t.category === 'Expense').reduce((acc, t) => {
            acc[t.description] = (acc[t.description] || 0) + t.amount;
            return acc;
        }, {});

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#7B68EE', '#8A2BE2', '#A52A2A', '#DC143C', '#FF4500', '#FFD700',
            '#ADFF2F', '#32CD32', '#4682B4', '#6A5ACD'
        ];

        if (barChart) barChart.destroy();
        if (donutChart) donutChart.destroy();

        const barCtx = document.getElementById('bar-chart').getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(expenseData),
                datasets: [{
                    label: 'Expenses',
                    data: Object.values(expenseData),
                    backgroundColor: colors,
                    borderColor: '#333',
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Expenses Breakdown by Description'
                    }
                }
            }
        });

        const donutCtx = document.getElementById('donut-chart').getContext('2d');
        donutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseData),
                datasets: [{
                    label: 'Expenses',
                    data: Object.values(expenseData),
                    backgroundColor: colors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Expense Distribution'
                    }
                }
            }
        });
    }

    document.getElementById('upload-button').addEventListener('click', () => {
        const fileInput = document.getElementById('upload-file');
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const content = e.target.result;

            if (fileType === 'csv') {
                parseCSV(content);
            } else if (fileType === 'xlsx') {
                parseXLSX(content);
            } else {
                alert('Unsupported file type. Please upload a CSV or XLSX file.');
            }
        };
        reader.readAsBinaryString(file);
    });

    function parseCSV(csv) {
        const rows = csv.split('\n').slice(1); // Skip header row if present
        rows.forEach(row => {
            const [description, amount, category, date, currency] = row.split(',');
            if (description && !isNaN(amount) && category && date && currency) {
                addTransaction(description.trim(), parseFloat(amount), category.trim(), date.trim(), currency.trim());
            }
        });
        alert('CSV transactions uploaded successfully.');
    }

    function parseXLSX(data) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        jsonData.forEach(row => {
            const { Description, Amount, Category, Date, Currency } = row;
            if (Description && !isNaN(Amount) && Category && Date && Currency) {
                addTransaction(Description.trim(), parseFloat(Amount), Category.trim(), Date.trim(), Currency.trim());
            }
        });
        alert('XLSX transactions uploaded successfully.');
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const currency = document.getElementById('currency').value;

        if (!description || isNaN(amount) || !category || !date) {
            alert('Please fill out all fields correctly.');
            return;
        }

        addTransaction(description, amount, category, date, currency);
        form.reset();
    });

    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });

    document.getElementById('export-button').addEventListener('click', () => {
        const worksheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
            ID: t.id,
            Description: t.description,
            Amount: t.amount,
            Category: t.category,
            Date: t.date,
            Currency: t.currency
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        XLSX.writeFile(workbook, 'Budget_Tracker_Transactions.xlsx');
    });

    renderTransactions();
    updateSummary();
    renderCharts();
});
