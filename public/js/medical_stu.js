document.addEventListener("DOMContentLoaded", async () => {
    // Check authentication and retrieve stored info
    const token = localStorage.getItem('token');
    const rollno = localStorage.getItem('rollno'); // Get roll no stored during login
    let currentHostel = localStorage.getItem('hostel_no');
    let currentRoom = localStorage.getItem('room_no');
    const emergencyPhone = localStorage.getItem('emergency_phone') || '+911234567890'; // Use default if not set


    if (!token || !rollno) {
        console.log("Token or RollNo missing, redirecting to login.");
        localStorage.clear();
        window.location.href = 'medical_login.html';
        return;
    }

    console.log(`Student page loading for RollNo: ${rollno}`);

    // --- Get DOM Elements ---
    const rollnoElement = document.getElementById('student-rollno');
    const studentNameElement = document.getElementById('student-name');
    const profileDetailsSection = document.querySelector('.profile-details'); // Get the section

    // Hostel/Room elements
    const hostelDisplay = document.getElementById('student-hostel');
    const roomDisplay = document.getElementById('student-room');
    const hostelInput = document.getElementById('edit-hostel');
    const roomInput = document.getElementById('edit-room');
    const editButton = document.getElementById('edit-details-btn');
    const saveButton = document.getElementById('save-details-btn');
    const cancelButton = document.getElementById('cancel-details-btn');
    const updateStatusElement = document.getElementById('update-status');


    // --- Populate Basic Info ---
    if (rollnoElement) {
        rollnoElement.textContent = escapeHtml(rollno);
    }
    // Set emergency call button functionality (if button exists)
    const emergencyBtn = document.querySelector('.emergency-btn');
    if (emergencyBtn) {
        emergencyBtn.onclick = () => window.location.href = `tel:${emergencyPhone}`;
    }

    // --- Fetch and Display Student Name ---
    if (studentNameElement) {
         const storedName = localStorage.getItem('studentName');
        if (storedName) {
             studentNameElement.textContent = `Welcome, ${escapeHtml(storedName)}`;
        } else {
            try {
                console.log("Fetching student name from server...");
                const response = await fetch(`/student/${rollno}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: 'Failed to parse error' }));
                    throw new Error(errorData.error || `Failed to fetch name: ${response.status}`);
                }
                const student = await response.json();
                if (student.success && student.name) {
                    studentNameElement.textContent = `Welcome, ${escapeHtml(student.name)}`;
                    localStorage.setItem('studentName', student.name); // Store fetched name
                } else {
                     throw new Error(student.error || 'Name not received from server.');
                }
            } catch (error) {
                console.error("Error fetching student data:", error);
                studentNameElement.textContent = 'Welcome, Student'; // Fallback name
                 if (error.message.includes("token") || error.message.includes("Forbidden") || String(error).includes("403") || String(error).includes("401")) {
                    alert("Session expired or invalid. Please log in again.");
                    localStorage.clear();
                    window.location.href = 'medical_login.html';
                }
            }
        }
    } else {
         console.warn("Element with ID 'student-name' not found.");
    }

    // --- Populate Hostel/Room Details ---
    function displayHostelRoom(hostel, room) {
        const displayValue = (value) => (value && value !== 'null' && value.trim() !== '') ? escapeHtml(value) : 'Not Set';
        const addMissingClass = (el, value) => {
            if (!value || value === 'null' || value.trim() === '') {
                 el.classList.add('value-missing');
             } else {
                 el.classList.remove('value-missing');
             }
        };

        if (hostelDisplay) {
             hostelDisplay.textContent = displayValue(hostel);
             addMissingClass(hostelDisplay, hostel);
        }
        if (roomDisplay) {
             roomDisplay.textContent = displayValue(room);
             addMissingClass(roomDisplay, room);
        }
    }
    displayHostelRoom(currentHostel, currentRoom);

    // --- Setup Edit/Save/Cancel Logic for Profile Details ---
    function toggleEditMode(isEditing) {
        if (!profileDetailsSection) return; // Guard clause

        if (isEditing) {
            profileDetailsSection.classList.add('editing');
        } else {
            profileDetailsSection.classList.remove('editing');
        }
        updateStatusElement.textContent = ''; // Clear status messages
    }

    if (editButton) {
        editButton.addEventListener('click', () => {
            // Pre-fill inputs with current values (handle null/empty)
            hostelInput.value = (currentHostel && currentHostel !== 'null') ? currentHostel : '';
            roomInput.value = (currentRoom && currentRoom !== 'null') ? currentRoom : '';
            toggleEditMode(true);
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            toggleEditMode(false);
            // No need to reset inputs, pre-fill on edit handles it
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const newHostel = hostelInput.value.trim();
            const newRoom = roomInput.value.trim();

            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;
            cancelButton.disabled = true;
            updateStatusElement.textContent = '';
            updateStatusElement.style.color = 'grey';

            try {
                const updateResponse = await fetch('/student/hostel-details', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        // Send empty strings as null effectively due to backend logic
                        hostel_no: newHostel,
                        room_no: newRoom
                    })
                });

                const updateResult = await updateResponse.json();

                if (updateResponse.ok && updateResult.success) {
                    // Update local state and localStorage
                    currentHostel = newHostel || null; // Store empty as null
                    currentRoom = newRoom || null;   // Store empty as null
                    localStorage.setItem('hostel_no', currentHostel || ''); // Store empty string in LS if null
                    localStorage.setItem('room_no', currentRoom || '');     // Store empty string in LS if null

                    // Update display
                    displayHostelRoom(currentHostel, currentRoom);
                    toggleEditMode(false); // Switch back to display mode

                    updateStatusElement.textContent = 'Details updated successfully!';
                    updateStatusElement.style.color = 'green';
                    setTimeout(() => { updateStatusElement.textContent = ''; }, 3000);

                } else {
                     let errorMsg = updateResult.error || 'Failed to save details.';
                     if (updateResult.errors) {
                         errorMsg = updateResult.errors.map(e => `${e.param}: ${e.msg}`).join(', ');
                     }
                     throw new Error(errorMsg);
                }

            } catch (error) {
                console.error("Error saving hostel details:", error);
                updateStatusElement.textContent = `Error: ${error.message}`;
                updateStatusElement.style.color = 'red';
                // Keep edit mode active on error
            } finally {
                 saveButton.textContent = 'Save Changes';
                 saveButton.disabled = false;
                 cancelButton.disabled = false;
            }
        });
    }

    // --- Load Medical Records ---
    console.log("Initiating loading of medical records...");
    await loadMedicalRecords(token, rollno); // This function populates the history table

    console.log("Student dashboard initial loading process complete.");

}); // End DOMContentLoaded


// --- Function to Load Medical Records (Includes Certificate Link) ---
async function loadMedicalRecords(token, rollno) {
    const tableBody = document.getElementById('records-table');
    if (!tableBody) {
        console.error("[Student Records FE] Medical records table body (ID 'records-table') not found.");
        return;
    }
    console.log(`[Student Records FE] Fetching records for rollno: ${rollno}`);
    tableBody.innerHTML = `<tr><td colspan="4" class="table-message">Loading records...</td></tr>`;

    try {
        const response = await fetch(`/records/${rollno}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
             let errorMsg = `Failed to fetch medical records (Status: ${response.status})`;
             if(result.error) errorMsg = result.error;
             console.error(`[Student Records FE] Error received from backend for ${rollno}:`, errorMsg);
             throw new Error(errorMsg);
        }

        const records = result.data || [];
        if (!Array.isArray(records)) {
             console.error("[Student Records FE] Received record data is not an array!", records);
             throw new Error("Invalid record data format received from server.");
        }

        tableBody.innerHTML = ""; // Clear loading message

        if (records.length > 0) {
             console.log(`[Student Records FE] Rendering ${records.length} records for ${rollno}.`);
            records.forEach((rec) => {
                const row = tableBody.insertRow();

                // Date Column
                let formattedDate = 'N/A';
                 if (rec.date) {
                    try {
                        const d = new Date(rec.date);
                        if (!isNaN(d.getTime())) {
                             formattedDate = d.toLocaleDateString();
                        } else { console.warn(`[Student Records FE] Invalid date value: ${rec.date}`); }
                    } catch(dateError) { console.warn(`[Student Records FE] Error parsing date '${rec.date}': ${dateError}`); }
                }
                row.insertCell().textContent = formattedDate;

                // Diagnosis Column
                row.insertCell().textContent = escapeHtml(rec.diagnosis);

                // Medications Column
                row.insertCell().textContent = escapeHtml(rec.medications);

                // Medical Certificate Column
                const certificateCell = row.insertCell();
                if (rec.certificate_download_path) {
                    const downloadLink = document.createElement('a');
                    downloadLink.href = rec.certificate_download_path;
                    downloadLink.textContent = 'Download'; // Shorter text
                    downloadLink.className = 'download-cert-link'; // Apply CSS class
                    downloadLink.title = 'Download Certificate'; // Add tooltip

                    // Authenticated download handler
                    downloadLink.onclick = async (e) => {
                        e.preventDefault();
                        const currentToken = localStorage.getItem('token');
                        if (!currentToken) {
                            alert('Authentication token missing. Please log in again.');
                            window.location.href = 'medical_login.html';
                            return;
                        }
                        const filename = rec.certificate_download_path.substring(rec.certificate_download_path.lastIndexOf('/') + 1);
                        const downloadUrl = downloadLink.href;
                        console.log(`Attempting authenticated download: ${filename} from ${downloadUrl}`);

                        // Add temporary loading feedback (optional)
                        const originalText = downloadLink.textContent;
                        downloadLink.textContent = 'Downloading...';
                        downloadLink.style.opacity = '0.7';

                        try {
                            const dlResponse = await fetch(downloadUrl, {
                                method: 'GET',
                                headers: { 'Authorization': `Bearer ${currentToken}` }
                            });
                            if (!dlResponse.ok) {
                                let errorMsg = `Download failed! Status: ${dlResponse.status}`;
                                try { const errData = await dlResponse.json(); errorMsg = errData.error || errorMsg; } catch(pE){}
                                throw new Error(errorMsg);
                            }
                            const blob = await dlResponse.blob();
                            if (!blob || blob.size === 0) { throw new Error("Received empty file."); }

                            // Trigger download
                            const blobUrl = window.URL.createObjectURL(blob);
                            const tempLink = document.createElement('a');
                            tempLink.style.display = 'none';
                            tempLink.href = blobUrl;
                            tempLink.setAttribute('download', filename);
                            document.body.appendChild(tempLink);
                            tempLink.click();
                            document.body.removeChild(tempLink);
                            window.URL.revokeObjectURL(blobUrl);
                            console.log(`Download initiated: ${filename}`);
                        } catch (dlError) {
                            console.error('Certificate download failed:', dlError);
                            alert(`Download failed: ${dlError.message}`);
                        } finally {
                            // Restore link appearance
                             downloadLink.textContent = originalText;
                             downloadLink.style.opacity = '1';
                        }
                    }; // End onclick
                    certificateCell.appendChild(downloadLink);
                } else {
                    // Display "NULL" or "Not Issued"
                    certificateCell.textContent = 'NULL'; // As requested
                    // Alternatively: certificateCell.textContent = 'Not Issued';
                    certificateCell.className = 'no-certificate-text'; // Apply CSS class
                }
            });
        } else {
            console.log(`[Student Records FE] No records found for ${rollno}.`);
            tableBody.innerHTML = `<tr><td colspan="4" class="table-message">No medical records found.</td></tr>`;
        }
    } catch (error) {
        console.error(`[Student Records FE] Error in loadMedicalRecords for ${rollno}:`, error);
        tableBody.innerHTML = `<tr><td colspan="4" class="table-message" style="color: red;">Error loading records: ${escapeHtml(error.message)}</td></tr>`;

        // Handle critical auth errors
        if (error.message.includes("token") || error.message.includes("Forbidden") || String(error).includes("403") || String(error).includes("401")) {
            alert("Session expired or invalid while fetching records. Please log in again.");
            localStorage.clear();
            window.location.href = 'medical_login.html';
        }
    }
}

// Helper function to escape HTML characters
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        if (unsafe == null) return ''; // Handle null or undefined
        try { unsafe = String(unsafe); } catch { return ''; } // Try converting other types
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// (Removed loadCertificates function)