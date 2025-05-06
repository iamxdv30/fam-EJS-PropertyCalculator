// Generate a unique visitor ID if not exists
function getVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

// Save deductions to localStorage
function saveDeductions() {
    const { names, amounts } = getDeductionValues();
    const deductions = names.map((name, index) => ({
        name: name,
        amount: amounts[index]
    }));
    localStorage.setItem(`deductions_${getVisitorId()}`, JSON.stringify(deductions));
}

// Load deductions from localStorage
function loadDeductions() {
    const deductions = JSON.parse(localStorage.getItem(`deductions_${getVisitorId()}`)) || [];
    const tbody = document.getElementById('deductionRows');
    tbody.innerHTML = '';
    
    if (deductions.length === 0) {
        addDeductionRow(); // Add one empty row if no saved deductions
    } else {
        deductions.forEach(deduction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="text" class="deduction-name" value="${deduction.name || ''}"/>
                    <span class="print-only">${deduction.name || ''}</span>
                </td>
                <td>
                    <input type="text" class="deduction-amount" value="${formatNumber(deduction.amount || 0)}" />
                    <span class="print-only">${formatNumber(deduction.amount || 0)}</span>
                </td>
                <td class="no-print action-column"><button type="button" class="delete-deduction danger" onclick="removeDeductionRow(this)">Delete</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    attachDeductionListeners();
    calculatePayments();
}

function formatCurrency(amount) {
    return 'PHP ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function roundToFive(num) {
    return Math.round(num / 5) * 5;
}

function formatNumber(amount) {
    // Handle empty or invalid input
    if (amount === '' || isNaN(amount)) return '';
    
    // Convert to number and format
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function unformatNumber(formattedAmount) {
    if (!formattedAmount) return '';
    return formattedAmount.replace(/,/g, '');
}

function addDeductionRow() {
    const tbody = document.getElementById('deductionRows');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <input type="text" class="deduction-name" />
            <span class="print-only"></span>
        </td>
        <td>
            <input type="text" class="deduction-amount" value="0.00" />
            <span class="print-only">0.00</span>
        </td>
        <td class="no-print action-column"><button type="button" class="delete-deduction danger" onclick="removeDeductionRow(this)">Delete</button></td>
    `;
    tbody.appendChild(row);
    attachDeductionListeners();
    saveDeductions();
}

function removeDeductionRow(btn) {
    btn.closest('tr').remove();
    calculatePayments();
    saveDeductions();
}

function getDeductionValues() {
    const names = Array.from(document.querySelectorAll('#deductionRows .deduction-name')).map(input => input.value);
    const amounts = Array.from(document.querySelectorAll('#deductionRows .deduction-amount')).map(input => {
        const value = unformatNumber(input.value);
        return value === '' ? 0 : parseFloat(value);
    });
    return { names, amounts };
}

function attachDeductionListeners() {
    const amountInputs = document.querySelectorAll('#deductionRows .deduction-amount');
    amountInputs.forEach(input => {
        // Remove old listeners
        input.removeEventListener('input', onDeductionChange);
        input.removeEventListener('blur', onDeductionBlur);
        // Add new listeners
        input.addEventListener('input', onDeductionChange);
        input.addEventListener('blur', onDeductionBlur);
    });
    
    const nameInputs = document.querySelectorAll('#deductionRows .deduction-name');
    nameInputs.forEach(input => {
        input.removeEventListener('input', onDeductionChange);
        input.addEventListener('input', onDeductionChange);
    });
}

function onDeductionBlur(event) {
    const input = event.target;
    const rawValue = input.value.replace(/,/g, '');
    
    if (rawValue !== '' && !isNaN(rawValue)) {
        const formattedValue = formatNumber(rawValue);
        input.value = formattedValue;
        
        // Update the print-only span
        const printSpan = input.parentElement.querySelector('.print-only');
        if (printSpan) {
            printSpan.textContent = formattedValue || '0.00';
        }
    }
    calculatePayments();
    saveDeductions();
}

function onDeductionChange(event) {
    const input = event.target;
    
    if (input.classList.contains('deduction-amount')) {
        // Allow only numbers and decimal point while typing
        input.value = input.value.replace(/[^\d.]/g, '');
        
        // Ensure only one decimal point
        const decimalCount = (input.value.match(/\./g) || []).length;
        if (decimalCount > 1) {
            input.value = input.value.replace(/\.+$/, '');
        }
    } else if (input.classList.contains('deduction-name')) {
        // Update print-only span for name
        const printSpan = input.parentElement.querySelector('.print-only');
        if (printSpan) {
            printSpan.textContent = input.value;
        }
    }
    
    calculatePayments();
    saveDeductions();
}



function getUniqueNames() {
    // Get names from both batches
    const batch1Names = getPaymentNames('batch1').filter(name => name.trim() !== '');
    const batch2Names = getPaymentNames('batch2').filter(name => name.trim() !== '');

    // Create a Set of unique names (case-sensitive)
    const uniqueNames = new Set();
    [...batch1Names, ...batch2Names].forEach(name => {
        if (name.trim()) uniqueNames.add(name.trim());
    });

    return { 
        batch1Names, 
        batch2Names, 
        uniqueNames,
        totalUniqueCount: uniqueNames.size 
    };
}

function calculatePayments() {
    // Prevent throwing errors during calculation
    try {
        const askingPrice = unformatNumber(document.getElementById('askingPrice').value) || 0;
        const initialPaymentTotal = unformatNumber(document.getElementById('initialPayment').value) || 0;
        const term = parseInt(document.getElementById('term').value);
        const billingCycle = term <= 6 ? "Semi-Annual" : "Quarterly";
        const numberOfPayments = term <= 6 ? 2 : Math.ceil(term / 3);

        // Get batch 1 amount
        let batch1Amount = unformatNumber(document.getElementById('batch1Amount').value) || 0;
        // Update the print-only span for batch1Amount
        const batch1AmountPrintSpan = document.getElementById('batch1AmountPrint');
        if (batch1AmountPrintSpan) {
            batch1AmountPrintSpan.textContent = formatNumber(batch1Amount); // Use the numeric value
        }
        let batch2Amount = 0;
        
        // Validate batch1Amount
        if (batch1Amount > initialPaymentTotal) {
            alert('Batch 1 amount cannot exceed Initial Payment');
            batch1Amount = initialPaymentTotal;
            document.getElementById('batch1Amount').value = formatNumber(batch1Amount);
        } else if (batch1Amount < 0) {
            alert('Batch 1 amount cannot be negative');
            batch1Amount = 0;
            document.getElementById('batch1Amount').value = formatNumber(batch1Amount);
        }

        // Only calculate batch 2 amount after validation
        if (batch1Amount >= 0 && batch1Amount <= initialPaymentTotal) {
            batch2Amount = initialPaymentTotal - batch1Amount;
            document.getElementById('batch2Amount').textContent = formatCurrency(batch2Amount);
        }

        // Calculate deduction total
        const { amounts } = getDeductionValues();
        const deductionTotal = amounts.reduce((sum, amount) => sum + amount, 0);
        document.getElementById('deductionTotal').textContent = formatCurrency(deductionTotal);

        // Get names and calculate unique names for each batch
        const { batch1Names, batch2Names } = getUniqueNames();
        
        // Get unique names for each batch
        const uniqueBatch1Names = new Set(batch1Names);
        const uniqueBatch2Names = new Set(batch2Names);

        // Calculate per person amounts for each batch (exact division)
        const batch1PerPerson = uniqueBatch1Names.size > 0 ? batch1Amount / uniqueBatch1Names.size : 0;
        const batch2PerPerson = uniqueBatch2Names.size > 0 ? batch2Amount / uniqueBatch2Names.size : 0;

        let totalBatch1Amount = 0;
        let totalBatch2Amount = 0;

        // Distribute batch1Amount among batch1Names
        if (batch1Names.length > 0) {
            const amountPerPersonBatch1 = batch1Amount / batch1Names.length;
            document.querySelectorAll('#batch1Rows tr').forEach(row => {
                const screenAmountSpan = row.querySelector('.payment-amount');
                const printAmountSpan = row.querySelector('.payment-amount-print');
                if (screenAmountSpan) {
                    screenAmountSpan.textContent = formatCurrency(amountPerPersonBatch1);
                }
                if (printAmountSpan) {
                    printAmountSpan.textContent = formatCurrency(amountPerPersonBatch1);
                }
                totalBatch1Amount += amountPerPersonBatch1;
            });
        }
        document.getElementById('batch1Subtotal').textContent = formatCurrency(totalBatch1Amount);

        // Distribute batch2Amount among batch2Names
        if (batch2Names.length > 0) {
            const amountPerPersonBatch2 = batch2Amount / batch2Names.length;
            document.querySelectorAll('#batch2Rows tr').forEach(row => {
                const screenAmountSpan = row.querySelector('.payment-amount');
                const printAmountSpan = row.querySelector('.payment-amount-print');
                if (screenAmountSpan) {
                    screenAmountSpan.textContent = formatCurrency(amountPerPersonBatch2);
                }
                if (printAmountSpan) {
                    printAmountSpan.textContent = formatCurrency(amountPerPersonBatch2);
                }
                totalBatch2Amount += amountPerPersonBatch2;
            });
        }
        document.getElementById('batch2Subtotal').textContent = formatCurrency(totalBatch2Amount);

        document.getElementById('initialTotal').textContent = formatCurrency(totalBatch1Amount + totalBatch2Amount);

        // Calculate remaining balance
        const balance = askingPrice - deductionTotal - initialPaymentTotal;

        // Get unique names from initial downpayment
        const uniqueInitialNames = new Set();
        [...batch1Names, ...batch2Names].forEach(name => {
            if (name.trim()) uniqueInitialNames.add(name.trim());
        });
        const uniqueInitialCount = uniqueInitialNames.size;

        // Calculate partition amount per unique person
        const partitionAmount = uniqueInitialCount > 0 ? roundToFive(balance / uniqueInitialCount) : 0;

        // Update balance and partition displays
        document.getElementById('balance').textContent = formatCurrency(balance);
        document.getElementById('partitionPP').innerHTML = `<strong>${formatCurrency(partitionAmount)}</strong>`;

        // Update billing cycle display
        document.getElementById('billingCycle').textContent = billingCycle;
        document.getElementById('termDisplay').textContent = `${term} Months`;

        // Update billing cycle display
        document.getElementById('billingCycle').textContent = billingCycle;
        document.getElementById('termDisplay').textContent = `${term} Months`;

        // Generate installment schedule
        const installmentRows = document.getElementById('installmentRows');
        installmentRows.innerHTML = ''; // Clear existing rows
        
        // Calculate equal installment amounts (rounded to nearest 5)
        const baseInstallmentAmount = roundToFive(partitionAmount / numberOfPayments);
        let remainingAmount = partitionAmount;
        
        // Add rows for each quarter
        for (let i = 1; i <= numberOfPayments; i++) {
            const row = document.createElement('tr');
            const label = billingCycle === "Semi-Annual" ? 
                (i === 1 ? "1st Half" : "2nd Half") : 
                `Q${i}`;
            
            // For the last payment, use remaining amount to ensure total matches exactly
            const currentInstallment = (i === numberOfPayments) ? 
                remainingAmount : 
                baseInstallmentAmount;
            
            remainingAmount -= baseInstallmentAmount;
                
            row.innerHTML = `
                <td>${label}</td>
                <td id="q${i}">${formatCurrency(currentInstallment)}</td>
            `;
            installmentRows.appendChild(row);
        }

        // Update total installment amount
        document.getElementById('installmentTotal').innerHTML = `<strong>${formatCurrency(partitionAmount)}</strong>`;

    } catch (error) {
        console.error('Error in calculatePayments:', error);
        // Don't show alert for calculation errors, just log them
        // This allows continuous editing without error popups
    }
}

// Calculate initial values when page loads
function attachCurrencyInputListeners() {
    // Add event listeners for currency inputs
    document.querySelectorAll('.currency-input').forEach(input => {
        // Format on blur
        input.addEventListener('blur', function(event) {
            const value = unformatNumber(event.target.value);
            event.target.value = formatNumber(value);
            
            // For batch1Amount, validate and update batch2Amount
            if (event.target.id === 'batch1Amount') {
                const initialPayment = unformatNumber(document.getElementById('initialPayment').value) || 0;
                if (value > initialPayment) {
                    alert('Batch 1 amount cannot exceed Initial Payment');
                    event.target.value = formatNumber(initialPayment);
                } else if (value < 0) {
                    alert('Batch 1 amount cannot be negative');
                    event.target.value = formatNumber(0);
                }
            }
            calculatePayments();
        });

        // For batch1Amount, prevent invalid input and update batch2 immediately
        if (input.id === 'batch1Amount') {
            input.addEventListener('input', function(event) {
                let value = unformatNumber(event.target.value) || 0;
                const initialPayment = unformatNumber(document.getElementById('initialPayment').value) || 0;
                
                // Silently prevent invalid values
                if (value > initialPayment) {
                    value = initialPayment;
                } else if (value < 0) {
                    value = 0;
                }
                
                // Update batch2Amount immediately
                const batch2Amount = initialPayment - value;
                document.getElementById('batch2Amount').textContent = formatCurrency(batch2Amount);
            });
        }
    });
    
    // Calculate initial values
    calculatePayments();
}

function onCurrencyInput(event) {
    let input = event.target;
    // Allow only numbers and decimal point while typing
    input.value = input.value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const decimalCount = (input.value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        input.value = input.value.replace(/\.+$/, '');
    }
}

function onCurrencyBlur(event) {
    const input = event.target;
    const rawValue = input.value.replace(/,/g, '');
    
    if (rawValue !== '' && !isNaN(rawValue)) {
        input.value = formatNumber(rawValue);
    }
    calculatePayments();
}

function addPaymentRow(batchId) {
    const tbody = document.getElementById(`${batchId}Rows`);
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <input type="text" class="payment-name" maxlength="30" />
            <span class="print-only"></span>
        </td>
        <td class="payment-amount-cell">
            <span class="payment-amount no-print">PHP 0.00</span>
            <span class="payment-amount-print print-only"></span>
        </td>
        <td class="no-print action-column">
            <button type="button" class="delete-payment danger" onclick="removePaymentRow(this, '${batchId}')">Delete</button>
        </td>
    `;
    tbody.appendChild(row);
    attachPaymentListeners();
    calculatePayments();
    savePayments();
}

function removePaymentRow(btn, batchId) {
    btn.closest('tr').remove();
    calculatePayments();
    savePayments();
}

function attachPaymentListeners() {
    const nameInputs = document.querySelectorAll('.payment-name');
    nameInputs.forEach(input => {
        input.removeEventListener('input', onPaymentNameChange);
        input.removeEventListener('blur', onPaymentNameBlur);
        input.addEventListener('input', onPaymentNameChange);
        input.addEventListener('blur', onPaymentNameBlur);
    });
}

function onPaymentNameChange(event) {
    const input = event.target;
    const printSpan = input.parentElement.querySelector('.print-only');
    if (printSpan) {
        printSpan.textContent = input.value;
    }
    savePayments();
}

function onPaymentNameBlur(event) {
    calculatePayments();
}

function getPaymentNames(batchId) {
    return Array.from(document.querySelectorAll(`#${batchId}Rows .payment-name`)).map(input => input.value);
}

function savePayments() {
    const batch1Names = getPaymentNames('batch1');
    const batch2Names = getPaymentNames('batch2');
    localStorage.setItem('paymentNames', JSON.stringify({ batch1: batch1Names, batch2: batch2Names }));
}

function loadPayments() {
    const savedNames = JSON.parse(localStorage.getItem('paymentNames')) || { batch1: ['Vangie', 'Doy', 'Romy'], batch2: ['Vangie', 'Doy', 'Romy'] };
    
    // Load Batch 1
    const batch1Tbody = document.getElementById('batch1Rows');
    batch1Tbody.innerHTML = '';
    savedNames.batch1.forEach(name => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" class="payment-name" value="${name}" maxlength="30" />
                <span class="print-only">${name}</span>
            </td>
            <td class="payment-amount-cell">
                <span class="payment-amount no-print">PHP 0.00</span>
                <span class="payment-amount-print print-only"></span>
            </td>
            <td class="no-print action-column">
                <button type="button" class="delete-payment danger" onclick="removePaymentRow(this, 'batch1')">Delete</button>
            </td>
        `;
        batch1Tbody.appendChild(row);
    });

    // Load Batch 2
    const batch2Tbody = document.getElementById('batch2Rows');
    batch2Tbody.innerHTML = '';
    savedNames.batch2.forEach(name => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" class="payment-name" value="${name}" maxlength="30" />
                <span class="print-only">${name}</span>
            </td>
            <td class="payment-amount-cell">
                <span class="payment-amount no-print">PHP 0.00</span>
                <span class="payment-amount-print print-only"></span>
            </td>
            <td class="no-print action-column">
                <button type="button" class="delete-payment danger" onclick="removePaymentRow(this, 'batch2')">Delete</button>
            </td>
        `;
        batch2Tbody.appendChild(row);
    });

    attachPaymentListeners();
    // Calculate initial amounts
    calculatePayments();
}

document.addEventListener('DOMContentLoaded', function() {
    loadDeductions(); // This will also attach listeners and calculate payments
    attachCurrencyInputListeners();
    loadPayments();
});