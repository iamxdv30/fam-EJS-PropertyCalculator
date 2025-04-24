function formatCurrency(amount) {
return 'PHP ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function addDeductionRow() {
    const tbody = document.getElementById('deductionRows');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="deduction-name" /></td>
        <td><input type="number" class="deduction-amount" min="0" step="any" value="0" /></td>
        <td><button type="button" class="delete-deduction danger" onclick="removeDeductionRow(this)">Delete</button></td>
    `;
    tbody.appendChild(row);
    attachDeductionListeners();
}

function removeDeductionRow(btn) {
    btn.closest('tr').remove();
    calculatePayments();
}

function getDeductionValues() {
    const names = Array.from(document.querySelectorAll('#deductionRows .deduction-name')).map(input => input.value);
    const amounts = Array.from(document.querySelectorAll('#deductionRows .deduction-amount')).map(input => parseFloat(input.value) || 0);
    return { names, amounts };
}

function attachDeductionListeners() {
    const amountInputs = document.querySelectorAll('#deductionRows .deduction-amount');
    amountInputs.forEach(input => {
        input.removeEventListener('input', calculatePayments);
        input.addEventListener('input', calculatePayments);
    });
    const nameInputs = document.querySelectorAll('#deductionRows .deduction-name');
    nameInputs.forEach(input => {
        input.removeEventListener('input', calculatePayments);
        input.addEventListener('input', calculatePayments);
    });
}

function calculatePayments() {
try {
const askingPrice = parseFloat(document.getElementById('askingPrice').value) || 0;
const termMonths = parseInt(document.getElementById('term').value) || 9;
const initialPaymentTotal = parseFloat(document.getElementById('initialPayment').value) || 150000;

        // Validate initial payment is not greater than asking price
        if (initialPaymentTotal > askingPrice) {
            alert("Initial payment cannot be greater than the asking price");
            return;
        }

        // Calculate deductions from dynamic rows
        const { amounts: deductionAmounts } = getDeductionValues();
        const deductionSubtotal = deductionAmounts.reduce((sum, val) => sum + val, 0);
        const deductionTotal = deductionSubtotal;
        const batch1Total = initialPaymentTotal * (2/3);
        const batch1PerPerson = batch1Total / 3;
        const batch2Total = initialPaymentTotal * (1/3);
        const batch2PerPerson = batch2Total / 3;

        const balanceRemaining = askingPrice - deductionTotal - initialPaymentTotal;
        const partitionPerPerson = balanceRemaining / 3;

        // Set billing cycle and number of payments based on term
        let billingCycle = "Quarterly";
        let numberOfPayments = 3; // default

        if (termMonths === 6) {
            billingCycle = "Semi-Annual";
            numberOfPayments = 2;
        } else if (termMonths === 12) {
            billingCycle = "Quarterly";
            numberOfPayments = 4;
        } else if (termMonths === 3) {
            billingCycle = "Quarterly";
            numberOfPayments = 1;
        }

        // Hide/show payment rows based on number of payments
        for (let i = 1; i <= 4; i++) {
            const paymentRow = document.getElementById(`payment${i}`);
            if (i <= numberOfPayments) {
                paymentRow.style.display = "";
            } else {
                paymentRow.style.display = "none";
            }
        }

        // Calculate and display payment amounts
        const paymentAmount = partitionPerPerson / numberOfPayments;

        // Update payment labels and amounts
        for (let i = 1; i <= numberOfPayments; i++) {
            const paymentLabel = document.getElementById(`q${i}`).previousElementSibling;
            const paymentAmount = partitionPerPerson / numberOfPayments;
            
            if (billingCycle === "Semi-Annual") {
                paymentLabel.textContent = i === 1 ? "1st Half" : "2nd Half";
            } else {
                paymentLabel.textContent = `Q${i}`;
            }
            
            document.getElementById(`q${i}`).textContent = formatCurrency(paymentAmount);
        }

        // Update all display values
        document.getElementById('price').textContent = formatCurrency(askingPrice);
        document.getElementById('deductionSubtotal').textContent = formatCurrency(deductionSubtotal);
        document.getElementById('deductionTotal').textContent = formatCurrency(deductionTotal);

        document.getElementById('vangie1').textContent = formatCurrency(batch1PerPerson);
        document.getElementById('doy1').textContent = formatCurrency(batch1PerPerson);
        document.getElementById('romy1').textContent = formatCurrency(batch1PerPerson);
        document.getElementById('batch1Subtotal').textContent = formatCurrency(batch1Total);

        document.getElementById('vangie2').textContent = formatCurrency(batch2PerPerson);
        document.getElementById('doy2').textContent = formatCurrency(batch2PerPerson);
        document.getElementById('romy2').textContent = formatCurrency(batch2PerPerson);
        document.getElementById('batch2Subtotal').textContent = formatCurrency(batch2Total);
        document.getElementById('initialTotal').textContent = formatCurrency(initialPaymentTotal);

        document.getElementById('balance').textContent = formatCurrency(balanceRemaining);
        document.getElementById('partitionPP').textContent = formatCurrency(partitionPerPerson);
        document.getElementById('billingCycle').textContent = billingCycle;
        document.getElementById('termDisplay').textContent = termMonths + ' Months';
        document.getElementById('installmentTotal').textContent = formatCurrency(partitionPerPerson);

    } catch (error) {
        console.error("Error in calculation:", error);
        alert("An error occurred while calculating. Please check the values and try again.");
    }
}

// Calculate initial values when page loads
document.addEventListener('DOMContentLoaded', function() {
    attachDeductionListeners();
    calculatePayments();
});