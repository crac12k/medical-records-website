/* === medical_staff.js === */

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn("No token found, redirecting to login.");
        window.location.href = 'medical_login.html';
        return;
    }

    //getting references to elements
    const rollNoInput = document.getElementById("roll-no");
    const studentNameInput = document.getElementById("student-name");
    const datePicker = document.getElementById("records-date-picker");
    const recordForm = document.getElementById("record-form");

    // Handle Date Picker Initialization and Event Listener 
    if (datePicker) {
        
        const savedDate = localStorage.getItem('selectedStaffDate');
        let initialDate;

        if (savedDate) {
            
            console.log(`Found saved date in localStorage: ${savedDate}`);
            initialDate = savedDate;
        } else {
            console.log("No saved date found, defaulting to today.");
            initialDate = getToday(); 
        }

        datePicker.value = initialDate; 

       
        datePicker.addEventListener('change', () => {
            const selectedDate = datePicker.value;
            console.log(`Date selected: ${selectedDate}. Reloading records and saving to localStorage...`);
     
            localStorage.setItem('selectedStaffDate', selectedDate);
            loadRecordsForDate(selectedDate); 
        });

        
        console.log(`Loading initial records for date: ${initialDate}`);
        loadRecordsForDate(initialDate);

    } else {
        console.warn("Date picker element not found.");
        
        loadRecordsForDate(getToday());
    }


    //event listener for auto-fetching student name
    if (rollNoInput && studentNameInput) {
        rollNoInput.addEventListener('blur', async () => {
            const rollNo = rollNoInput.value.trim();
           
            studentNameInput.value = '';
            studentNameInput.readOnly = false;
            if (!rollNo) {
                studentNameInput.placeholder = ""; 
                return;
            }
            studentNameInput.placeholder = "Fetching name...";
            try {
                const fetchToken = localStorage.getItem('token');
                if (!fetchToken) throw new Error("Auth token missing.");

                const response = await fetch(`/student/${encodeURIComponent(rollNo)}`, {
                    headers: { 'Authorization': `Bearer ${fetchToken}`, 'Accept': 'application/json' }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.name) {
                        studentNameInput.value = result.name;
                        studentNameInput.placeholder = "";
                        
                    } else {
                        
                        studentNameInput.placeholder = "Student not found";
                        studentNameInput.readOnly = false;
                    }
                } else if (response.status === 404) {
                    studentNameInput.placeholder = "Student not found";
                    studentNameInput.readOnly = false;
                } else {
                    
                    const eRes = await response.json().catch(() => ({}));
                    console.error("Error fetching student name - Status:", response.status, "Msg:", eRes.error);
                    studentNameInput.placeholder = "Error fetching name";
                    studentNameInput.readOnly = false;
                    
                }
            } catch (error) {
                console.error("Network or other error fetching student name:", error);
                studentNameInput.placeholder = "Error";
                studentNameInput.value = '';
                studentNameInput.readOnly = false;
            }
        });
    } else {
        console.warn("Roll number input or Student name input not found.");
    }


    // Add form submission handler for new records
     if (recordForm) {
        recordForm.addEventListener("submit", handleFormSubmit);
    } else { console.warn("Record form not found."); }
});

// Gets today's date in YYYY-MM-DD format
function getToday() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

// Function to handle saving a NEW patient record
async function handleFormSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById("student-name");
    const rollNoInput = document.getElementById("roll-no");
    const diagnosisInput = document.getElementById("diagnosis");
    const medicationsInput = document.getElementById("medications");

    const name = nameInput?.value.trim();
    const roll_no = rollNoInput?.value.trim();
    const diagnosis = diagnosisInput?.value.trim();
    const medications = medicationsInput?.value.trim();
    // Use today's date for the 'date' field of the record when saving
    const date = getToday();

    
    if (!name || !roll_no || !diagnosis || !medications) {
         alert('Please fill all fields (Student Name, Roll No., Diagnosis, Medications).');
         return;
    }
   
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Authentication error. Please log in again.');
            window.location.href = 'medical_login.html';
            return;
        }
        const response = await fetch('/medical/staff/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, roll_no, diagnosis, medications, date }) // Send today's date
        });
        const result = await response.json();
        if (response.ok && result.success) {
            alert('Record saved successfully!');
            document.getElementById("record-form")?.reset(); //
            if(nameInput) { nameInput.placeholder = ""; nameInput.readOnly = false; }
            if(rollNoInput) { rollNoInput.value = ''; }
            if(diagnosisInput) { diagnosisInput.value = ''; }
            if(medicationsInput) { medicationsInput.value = ''; }

            // Reload records for the currently selected date in the picker to show the new entry
            const currentSelectedDate = document.getElementById("records-date-picker")?.value || getToday();
            await loadRecordsForDate(currentSelectedDate);
        } else {
            
            throw new Error(result.error || `Save failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Error saving record:', error);
        alert(`Save failed: ${error.message}`);
    }
}


// *** MODIFIED: Function to load records for a SPECIFIC date ***
async function loadRecordsForDate(targetDate) {
    const tableBody = document.getElementById("records-table")?.querySelector('tbody');
    if (!tableBody) { console.error("Records table body not found"); return; }
    console.log(`Loading records for date: ${targetDate}...`);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 15px; color: #555;">Loading records for ${targetDate}...</td></tr>`;

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Authentication token not found.");

        const response = await fetch(`/medical/staff/records?date=${targetDate}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || `Failed to fetch records (Status: ${response.status})`);
        }

        const records = result.data || [];
        tableBody.innerHTML = ''; 

        if (records.length > 0) {
            records.forEach((record) => { 
                const row = tableBody.insertRow();
                let recordTime = 'N/A';
                try {
                    // Format time from created_at timestamp
                    const recordDate = new Date(record.created_at);
                    if (!isNaN(recordDate.getTime())) {
                         recordTime = recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                } catch (e) { console.warn("Error parsing record timestamp:", e); }

                
                const escapedName = escapeHtml(record.name);
                const escapedRollNo = escapeHtml(record.roll_no);
                const escapedDiagnosis = escapeHtml(record.diagnosis);
                const escapedMedications = escapeHtml(record.medications);

                
                row.insertCell().textContent = recordTime;
                row.insertCell().textContent = escapedName;
                row.insertCell().textContent = escapedRollNo;
                row.insertCell().textContent = escapedDiagnosis;
                row.insertCell().textContent = escapedMedications;

                
                const actionCell = row.insertCell();
                const certButton = document.createElement('button');

                
                const buttonId = `issue-cert-btn-${record.recordId}`;
                certButton.id = buttonId;
                certButton.className = 'issue-cert-btn'; 

               
                certButton.dataset.recordId = record.recordId; 
                certButton.dataset.rollNo = record.roll_no;
                certButton.dataset.name = record.name;
                certButton.dataset.diagnosis = record.diagnosis;
                certButton.dataset.medications = record.medications;
                certButton.dataset.buttonId = buttonId; // 

            
                if (record.hasCertificate) {
                    certButton.textContent = 'Certificate Issued';
                    certButton.disabled = true;
                    certButton.style.cursor = 'not-allowed';
                    certButton.style.opacity = '0.6';
                    certButton.style.backgroundColor = '#6c757d'; 
                } else {
                    certButton.textContent = ' + Issue Medical Certificate';
                    certButton.disabled = false;
                    
                    certButton.onclick = () => openCertificateTemplate(certButton.dataset);
                    certButton.style.cursor = 'pointer';
                    certButton.style.opacity = '1';
                    certButton.style.backgroundColor = ''; 
                }
                actionCell.appendChild(certButton);
            });
        } else {
            
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6; 
            cell.textContent = `No records found for ${targetDate}`;
            cell.style.textAlign = 'center';
            cell.style.padding = '15px';
        }
    } catch (error) {
        console.error("Error loading records for date:", error);
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
        cell.textContent = `Error loading records: ${escapeHtml(error.message)}`;
        cell.style.textAlign = 'center';
        cell.style.color = 'red';
        cell.style.padding = '15px';
        // Redirect to login if auth error
        if (error.message.includes("token") || error.message.includes("Forbidden")) {
             alert("Authentication error or session expired. Please log in again.");
             localStorage.clear(); 
             setTimeout(() => { window.location.href = 'medical_login.html'; }, 2000);
        }
    }
}


//Function to open the certificate template page 
function openCertificateTemplate(data) {
    
    const certificateData = {
        recordId: data.recordId, 
        rollNo: data.rollNo,
        name: data.name,
        diagnosis: data.diagnosis,
        medications: data.medications,
        date: getToday() 
    };
    try {
        
        localStorage.setItem('certificateData', JSON.stringify(certificateData));
        
        localStorage.setItem('certificateButtonId', data.buttonId);

        // Open the certificate template 
        const certWindow = window.open('certificate_template.html', '_blank');
        if (!certWindow) {
            alert("Popup blocked? Please allow popups for this site to issue certificates.");
        }
    } catch (storageError) {
        console.error("Error using localStorage:", storageError);
        alert("Could not store data necessary for certificate generation. Please check browser settings.");
    }
}


window.disableCertificateButton = (buttonId) => {
    const button = document.getElementById(buttonId);
    if (button && !button.disabled) {
        button.disabled = true;
        button.textContent = 'Certificate Issued';
        button.style.cursor = 'not-allowed';
        button.style.opacity = '0.6';
        button.style.backgroundColor = '#6c757d';
        button.onclick = null; 
        console.log(`Button ${buttonId} disabled successfully.`);
    } else if (!button) {
        console.warn(`Attempted to disable button ${buttonId}, but it was not found.`);
        
    } else {
        console.log(`Button ${buttonId} was already disabled.`);
    }
};

// HTML escaping function
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        if (unsafe == null) return ''; 
        try {
            
            return String(unsafe)
                   .replace(/&/g, "&amp;")
                   .replace(/</g, "&lt;")
                   .replace(/>/g, "&gt;")
                   .replace(/"/g, "&quot;")
                   .replace(/'/g, "&#039;");
        } catch {
            return ''; 
        }
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


window.addEventListener('storage', (event) => {
    // Example: If the certificateButtonId is removed by the closing certificate window
    if (event.key === 'certificateButtonId' && event.newValue === null && event.oldValue) {
        console.log(`Storage event detected: Button ID ${event.oldValue} potentially cleared.`);
       
    }
   
    if (event.key === 'selectedStaffDate' && event.newValue) {
         const datePicker = document.getElementById("records-date-picker");
         if (datePicker && datePicker.value !== event.newValue) {
             console.log("Staff date changed in another tab/window. Updating current view.");
             datePicker.value = event.newValue;
             loadRecordsForDate(event.newValue);
         }
    }
});