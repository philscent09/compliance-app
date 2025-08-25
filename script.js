document.addEventListener('DOMContentLoaded', () => {
            // Data is now fetched from the server; these keys are no longer needed.
            // const LOCAL_STORAGE_KEY_DOCUMENTS = 'govDocsRepository_documents_v3';
            // const LOCAL_STORAGE_KEY_ARCHIVES = 'govDocsRepository_archives_v3';
            const LOCAL_STORAGE_KEY_LOCATIONS = 'govDocsRepository_locations_v3';
            const LOCAL_STORAGE_KEY_THEME = 'govDocsRepository_theme';
            const LOCAL_STORAGE_KEY_ARCHIVE_VISIBILITY = 'govDocsRepository_archive_visibility';
            const LOCAL_STORAGE_KEY_ABOUT_PANEL_VISIBILITY = 'govDocsRepository_about_panel_visibility';
            const MAX_FILE_SIZE_MB = 1.2; // Set max file size in MB


            let documents = [];
            let archivedDocuments = [];
            let locations = [];
            let complianceDataCache = {};
            let docNameToAgencyMap = {}; // For pre-filling 'add' form

            let currentMainSortKey = null;
            let currentMainSortDirection = 'asc';
            let currentArchivedSortKey = null;
            let currentArchivedSortDirection = 'asc';
			let currentLocationSort = 'compliance_desc';

            // Variable to store the original expiration date when renewing
            let originalRenewalExpirationDate = null;

            const PREDEFINED_LOCATIONS = [
                { id: 'paranaque', name: 'Paranaque' },
                { id: 'laguna', name: 'Laguna' },
                { id: 'dumaguete', name: 'Dumaguete' },
                { id: 'bgc', name: 'BGC' },
            ];

            const documentNameOptions = {
                "City Mayor's Office": ["Mayor's / Business Permit", "Other"],
                "City Engineer's Office": ["Mechanical Permit", "Eletrical Permit", "Plumbing Permit", "Electronics Permit", "Building Permit", "Occupancy Permit", "City Engineer's Inspection Certificate", "Other"],
                "City Health Office": ["Sanitary Permit", "Other"],
                "Barangay Office": ["Barangay Clearance", "Environmental Clearance", "Other"],
                "Bureau of Fire & Protection (BFP)": ["Fire Drill Certificate 1", "Fire Drill Certificate 2", "BFP Site Inspection Report", "Fire Safety Maintenance Report", "Fuel Tank Clearance", "Fire Safety Inspection Certificate (FSIC)", "Other"],
                "Department of Environment & Natural Resources (DENR)": ["Certificate of Non-Coverage (CNC)", "HazWaste ID (HWID)", "Pollution Control Officer Certificate", "Permit to Operate (Generator Sets)", "Water Discharge Permit", "Self Monitoring Report Q1", "Self Monitoring Report Q2", "Self Monitoring Report Q3", "Self Monitoring Report Q4", "Other"],
                "Philippine Economic Zone Authority (PEZA)": ["Certificate of Registration", "Occupancy Permit", "Certificate of Annual Inspection", "Permit to Operate (Electrical Equipment)", "Permit to Operate (Mechanical Equipment)", "Permit to Operate (Electronics Equipment)", "Other"],
                "BFP Central Liaison Unit (BFP-CLU)": ["Other"],
                "Department of Labor & Employment (DOLE)": ["Work Environment Measurement Report (WEM)", "NCII Electrical Installation", "NCII DOMRAC", "Permit to Operate (Electrical Equipment)", "Permit to Operate (Mechanical Equipment)", "Other"],
                "Department of Energy (DOE)": ["Energy Audit", "Annual Energy Efficiency & Conservation Report (AEECR)", "Annual Energy Utilization Report (AEUR)", "Other"],
                "International Organization for Standardization (ISO)": ["ISO 14001:2015 Environmental Management System", "Other"],
                "Laguna Lake Development Agency (LLDA)": ["Certificate of Interconnection", "Water Discharge Permit", "Other"],
                "Other": ["Other"] // Added for the new functionality
            };

            const masterDocumentList = [...new Set(Object.values(documentNameOptions).flat())].filter(name => name !== 'Other');
            const locationRequirements = {
                paranaque: masterDocumentList,
                laguna: masterDocumentList,
                dumaguete: masterDocumentList,
                bgc: masterDocumentList
            };


            const entityNameOptions = {
                "paranaque": ["SPi Tech", "PSIDC", "SPiT Foundation", "AOPH", "Concessionaire", "Water Vendor", "Other"],
                "laguna": ["SPi Tech > C3-6 Bldg.", "SPi Tech > C3-7 Bldg.", "Concessionaire", "Water Vendor", "Other"],
                "dumaguete": ["SPi Tech", "Concessionaire", "Water Vendor", "Other"],
                "bgc": ["SPi Tech", "Other"]
            };
            
            // --- DOM Elements ---
            const globalNotificationDiv = document.getElementById('globalNotification');
            const notificationMessageSpan = document.getElementById('notificationMessage');
            const locationSelect = document.getElementById('location-select');
            const addDocumentBtn = document.getElementById('addDocumentBtn');
            const renewDocumentBtn = document.getElementById('renewDocumentBtn');
            const filterInputs = document.querySelectorAll('input[name="documentFilter"]');
            const filterAgencyNameInput = document.getElementById('filter-agency-name');
            const filterDocumentNameInput = document.getElementById('filter-document-name');
            const notificationsList = document.getElementById('notificationsList');
            const documentsTable = document.getElementById('documentsTable');
            const documentsTableBody = document.getElementById('documentsTableBody');
            const documentsTableFoot = document.getElementById('documentsTableFoot');
            const archivedTableFoot = document.getElementById('archivedTableFoot');
            const documentModal = document.getElementById('documentModal');
            const modalTitle = document.getElementById('modal-title');
            const documentForm = document.getElementById('documentForm');
            const saveDocumentBtn = document.getElementById('saveDocumentBtn');
            const cancelDocumentBtn = document.getElementById('cancelDocumentBtn');
            const closeModalBtn = document.getElementById('closeModalBtn');
            const currentAttachmentP = document.getElementById('current-attachment');
            const renewModal = document.getElementById('renewModal');
            const closeRenewModalBtn = document.getElementById('closeRenewModalBtn');
            const renewDocSelect = document.getElementById('renew-doc-select');
            const renewLocationInfo = document.getElementById('renew-location-info');
            const renewConfirmBtn = document.getElementById('renew-confirm');
            const renewCancelBtn = document.getElementById('renew-cancel');
            const themeSwitcher = document.getElementById('theme-switcher');
            const sunIcon = document.getElementById('sun-icon');
            const moonIcon = document.getElementById('moon-icon');
            const toggleArchivedTableBtn = document.getElementById('toggleArchivedTableBtn');
            const archivedTableContainer = document.getElementById('archivedTableContainer');
            const filterArchivedAgencyInput = document.getElementById('filter-archived-agency');
            const filterArchivedDocumentInput = document.getElementById('filter-archived-document');
            const formAgencyNameSelect = document.getElementById('form-agency-name');
            const formAgencyNameOtherInput = document.getElementById('form-agency-name-other');
            const formDocumentNameSelect = document.getElementById('form-document-name');
            const formDocumentNameOtherInput = document.getElementById('form-document-name-other');
            const formEntityNameSelect = document.getElementById('form-entity-name');
            const formEntityNameOtherInput = document.getElementById('form-entity-name-other');
            const formLocationSelect = document.getElementById('form-location');
            const manageDocumentsSection = document.getElementById('manage-documents-section');
			const locationSortingControls = document.getElementById('location-sorting-controls');
			const generateReportBtn = document.getElementById('generateReportBtn');
            const generateFullReportBtn = document.getElementById('generateFullReportBtn');
			const statusLogModal = document.getElementById('statusLogModal');
            const closeStatusLogModalBtn = document.getElementById('closeStatusLogModalBtn');
            const statusLogTitle = document.getElementById('statusLogTitle');
            const commentHistoryList = document.getElementById('commentHistoryList');
            const newCommentForm = document.getElementById('newCommentForm');
            const newCommentText = document.getElementById('newCommentText');
            const newCommentor = document.getElementById('newCommentor');
            
            const formErrorElements = {
                'agency-name': document.getElementById('agency-name-error'),
                'document-name': document.getElementById('document-name-error'),
                'document-number': document.getElementById('document-number-error'),
                'issuance-date': document.getElementById('issuance-date-error'),
                'expiration-date': document.getElementById('expiration-date-error'),
                'date-order': document.getElementById('date-order-error'),
                'location': document.getElementById('location-error'),
                'entity-name': document.getElementById('entity-name-error'),
                'renewal-date': document.getElementById('renewal-date-error') // Added for renewal validation
            };

            const archivedDocumentsTable = document.getElementById('archivedDocumentsTable');
            const archivedDocumentsTableBody = document.getElementById('archivedDocumentsTableBody');
            const filterArchivedLocationSelect = document.getElementById('filter-archived-location'); // New filter
            const filterArchivedYearSelect = document.getElementById('filter-archived-year'); // New filter
			const notificationActionModal = document.getElementById('notificationActionModal');
            const closeNotificationActionModalBtn = document.getElementById('closeNotificationActionModalBtn');
            const notificationActionTitle = document.getElementById('notificationActionTitle');
            const notificationActionContent = document.getElementById('notificationActionContent');
            const actionViewStatusBtn = document.getElementById('actionViewStatusBtn');
            const actionRenewBtn = document.getElementById('actionRenewBtn');

            // Add Modal controls for one-time issuance
            const addExpInput = document.getElementById('form-expiration-date');
            const addOneTimeCheckbox = document.getElementById('oneTimeIssuanceCheckbox');

            // About / Version Info Panel elements
            const aboutPanelHeader = document.getElementById('aboutPanelHeader');
            const aboutPanelContent = document.getElementById('aboutPanelContent');
            const toggleAboutPanelBtn = document.getElementById('toggleAboutPanelBtn');

            // Preview Modal Elements
            const previewModal = document.getElementById('previewModal');
            const closePreviewModalBtn = document.getElementById('closePreviewModalBtn');
            const previewModalTitle = document.getElementById('preview-modal-title');
            const previewContent = document.getElementById('previewContent');
            const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            let currentPreviewScale = 1; // For image zoom

            // Compliance Details Modal Elements
            const complianceDetailsModal = document.getElementById('complianceDetailsModal');
            const closeComplianceModalBtn = document.getElementById('closeComplianceModalBtn');
            const complianceModalTitle = document.getElementById('compliance-modal-title');
            const compliantDocsList = document.getElementById('compliant-docs-list');
            const lackingDocsList = document.getElementById('lacking-docs-list');
            const expiredDocsList = document.getElementById('expired-docs-list');
            const expiringDocsList = document.getElementById('expiring-docs-list');


            // --- Helper Functions ---
            
            function formatDate(dateInput) {
                if (!dateInput) return 'N/A';
                const date = new Date(dateInput);
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }

            function generateUUID() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }

            function displayGlobalMessage(message, type = 'error') {
                notificationMessageSpan.textContent = message;
                globalNotificationDiv.className = 'error-display active';
                if (type === 'success') {
                    globalNotificationDiv.style.backgroundColor = 'var(--color-success-bg)';
                    globalNotificationDiv.style.borderColor = 'var(--color-success)';
                    notificationMessageSpan.style.color = 'var(--color-success)';
                } else {
                    globalNotificationDiv.style.backgroundColor = 'var(--color-danger-bg)';
                    globalNotificationDiv.style.borderColor = 'var(--color-danger)';
                    notificationMessageSpan.style.color = 'var(--color-danger)';
                }
                setTimeout(() => globalNotificationDiv.classList.remove('active'), 4000);
            }

            function saveDataToLocalStorage(key, data) {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                } catch (e) {
                    console.error("Error saving to localStorage:", e);
                    displayGlobalMessage("Failed to save data. Storage might be full.");
                }
            }

            function loadDataFromLocalStorage(key) {
                try {
                    const data = localStorage.getItem(key);
                    return data ? JSON.parse(data) : [];
                } catch (e) {
                    console.error("Error loading from localStorage:", e);
                    return [];
                }
            }
            
            const createTableCell = (content, className = '') => {
                const cell = document.createElement('td');
                if (typeof content === 'string') {
                    cell.textContent = content;
                } else {
                    cell.appendChild(content);
                }
                if(className) cell.className = className;
                return cell;
            };
            
            const filterDocuments = (docs, agencyName, docName, locationId, year) => {
                const agencyFilter = agencyName ? agencyName.toLowerCase().trim() : '';
                const docNameFilter = docName ? docName.toLowerCase().trim() : '';
                const locationFilter = locationId ? locationId : '';
                const yearFilter = year ? parseInt(year) : null;

                return docs.filter(doc => 
                    (agencyFilter ? doc.agencyName.toLowerCase().includes(agencyFilter) : true) &&
                    (docNameFilter ? doc.documentName.toLowerCase().includes(docNameFilter) : true) &&
                    (locationFilter ? doc.locationId === locationFilter : true) &&
                    (yearFilter ? new Date(doc.archivedAt || doc.issuanceDate).getFullYear() === yearFilter : true) // Use archivedAt for archived docs, or issuanceDate as fallback
                );
            };

            function getNotificationStatus(doc) {
                if (doc.oneTimeIssuance) {
                    return { status: 'N/A (One-Time)', type: 'success' };
                }

                const today = new Date();
                today.setHours(0,0,0,0);
                const expDate = new Date(doc.expirationDate);
                const userTimezoneOffset = expDate.getTimezoneOffset() * 60000;
                const localExpDate = new Date(expDate.getTime() + userTimezoneOffset);
                localExpDate.setHours(0,0,0,0);
                
                const diffTime = localExpDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) return { status: `Expired`, type: 'danger' };
                if (diffDays <= 90) return { status: `Expires in ${diffDays}d`, type: 'warning' };
                return { status: 'Active', type: 'success' };
            }

            function getLocationNameById(locationId) {
                const location = locations.find(loc => loc.id === locationId);
                return location ? location.name : 'Unknown';
            }

            function sortDocuments(docs, key, direction) {
                return [...docs].sort((a, b) => {
                    let aVal = a[key];
                    let bVal = b[key];

                    if (key.includes('Date') || key === 'archivedAt') {
                        aVal = new Date(aVal);
                        bVal = new Date(bVal);
                    }
                    
                    if (key === 'locationId') {
                        aVal = getLocationNameById(aVal);
                        bVal = getLocationNameById(bVal);
                    }

                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                         return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    } else if (aVal < bVal) {
                        return direction === 'asc' ? -1 : 1;
                    } else if (aVal > bVal) {
                        return direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                });
            }
			
			// --- NEW: Server Communication Functions ---

            async function fetchDataFromServer() {
                try {
                    const response = await fetch('/api/documents');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    documents = data.documents || [];
                    archivedDocuments = data.archives || [];
                    console.log("Data fetched from server.", { documents, archivedDocuments });
                    updateUI(); // Re-render everything with the new data
                } catch (error) {
                    console.error("Failed to fetch data from server:", error);
                    displayGlobalMessage("Could not load documents from the server. Please check your connection.");
                }
            }

            // This function replaces the old saveDataToLocalStorage for documents
            async function postDocumentToServer(formData) {
                 try {
                    const response = await fetch('/api/documents', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
                    }
                    
                    const result = await response.json();
                    displayGlobalMessage(result.message || 'Document saved successfully!', 'success');
                    await fetchDataFromServer(); // Fetch fresh data to ensure UI is in sync
                 } catch (error) {
                    console.error('Error saving document:', error);
                    displayGlobalMessage(`Failed to save document: ${error.message}`);
                 }
            }
            
            // --- UI Rendering ---

            function renderMainDocumentsTable() {
                let docsToDisplay = [...documents];
                const selectedLocation = locationSelect.value;
                if (selectedLocation) {
                    docsToDisplay = docsToDisplay.filter(doc => doc.locationId === selectedLocation);
                }
                
                const selectedFilter = document.querySelector('input[name="documentFilter"]:checked').value;
                if (selectedFilter !== 'all') {
                    docsToDisplay = docsToDisplay.filter(doc => {
                        const statusType = getNotificationStatus(doc).type;
                        if (selectedFilter === 'non-expiring') return statusType === 'success';
                        if (selectedFilter === 'expiring') return statusType === 'warning' || statusType === 'danger';
                        return true;
                    });
                }
                
                docsToDisplay = filterDocuments(docsToDisplay, filterAgencyNameInput.value, filterDocumentNameInput.value);
                
                if (currentMainSortKey) {
                    docsToDisplay = sortDocuments(docsToDisplay, currentMainSortKey, currentMainSortDirection);
                }

                documentsTable.querySelectorAll('.sort-header').forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    if (header.dataset.sortKey === currentMainSortKey) {
                        header.classList.add(`sort-${currentMainSortDirection}`);
                    }
                });
                
                documentsTableBody.innerHTML = '';
                documentsTableFoot.classList.toggle('hidden', docsToDisplay.length > 0);

                docsToDisplay.forEach(doc => {
                    const row = documentsTableBody.insertRow();
                    row.dataset.docId = doc.id;
                    const status = getNotificationStatus(doc);

                    if (status.type === 'danger') row.classList.add('row-expired');
                    else if (status.type === 'warning') row.classList.add('row-expiring');
                    
                    const statusSpan = document.createElement('span');
                    statusSpan.className = `status-span ${status.type}`;
                    statusSpan.textContent = status.status;
                    
                    // Create the Agency cell with conditional button
                    const agencyCell = createTableCell(doc.agencyName);
                    if (status.type === 'warning' || status.type === 'danger') {
                        agencyCell.classList.add('agency-cell-flex');
                        const renewalButtonHTML = `<button class="renewal-status-button" data-doc-id="${doc.id}">Renewal Status</button>`;
                        agencyCell.innerHTML = `<span>${doc.agencyName}</span>${renewalButtonHTML}`;
                    }
                    
                    const actionsCell = document.createElement('div');
                    actionsCell.className = 'actions-cell';
                    // MODIFICATION: Check for attachmentPath from the server.
                    if (doc.attachmentPath) {
                        const fileName = doc.attachmentPath.split('/').pop();
                        actionsCell.innerHTML += `<span class="attachment-indicator" data-id="${doc.id}" title="Preview: ${fileName}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81"></path></svg>
                        </span>`;
                    } else {
                        actionsCell.innerHTML += `<span class="attachment-indicator" title="No Attachment">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:1.2rem; height:1.2rem; opacity: 0.5;">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739L16.29 14.825a.75.75 0 00-1.06 0L13.14 17.51a.75.75 0 000 1.06l2.086 2.086a4.5 4.5 0 006.364-6.364l-1.094-1.094zM12.739 18.375L14.825 16.29a.75.75 0 000-1.06L17.51 13.14a.75.75 0 001.06 0l2.086 2.086a4.5 4.5 0 000-6.364L12.739 5.625M.525 5.625L5.625 10.739M10.739 5.625L5.625 10.739M5.625 10.739V5.625" />
                            </svg>
                        </span>`;
                    }

                    const isDisabled = status.type === 'danger' || status.type === 'warning';
                    const disabledAttribute = isDisabled ? 'disabled' : '';
                    
                    let editTooltipText = `Edit Document`;
                    let deleteTooltipText = `Delete Document`;

                    if (isDisabled) {
                        editTooltipText = 'Disabled: Document is expiring/expired';
                        deleteTooltipText = 'Disabled: Document is expiring/expired';
                    }

                    actionsCell.innerHTML += `
                        <button data-id="${doc.id}" class="action-button edit-button-icon" title="${editTooltipText}" ${disabledAttribute}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                        </button>
                        <button data-id="${doc.id}" class="action-button delete-button-icon" title="${deleteTooltipText}" ${disabledAttribute}>
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:1rem; height:1rem;">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0h8m-9 4v6m4-6v6m4-6v6M4 7h16l-1 12a2 2 0 01-2 2H7a2 2 0 01-2-2L4 7z"/>
                           </svg>
                        </button>`;
                    
                    row.appendChild(agencyCell);
                    row.appendChild(createTableCell(doc.documentName));
                    row.appendChild(createTableCell(doc.documentNumber));
                    row.appendChild(createTableCell(formatDate(doc.issuanceDate)));
                    row.appendChild(createTableCell(doc.oneTimeIssuance ? 'N/A (One-Time)' : formatDate(doc.expirationDate)));
                    row.appendChild(createTableCell(getLocationNameById(doc.locationId)));
                    row.appendChild(createTableCell(doc.entityName || 'N/A'));
                    row.appendChild(createTableCell(statusSpan));
                    row.appendChild(createTableCell(actionsCell));
                });
            }

            function renderArchivedDocumentsTable() {
                const agencyFilter = filterArchivedAgencyInput.value;
                const docNameFilter = filterArchivedDocumentInput.value;
                const locationFilter = filterArchivedLocationSelect.value;
                const yearFilter = filterArchivedYearSelect.value;

                let filteredArchived = filterDocuments(archivedDocuments, agencyFilter, docNameFilter, locationFilter, yearFilter);
                
                if (currentArchivedSortKey) {
                    filteredArchived = sortDocuments(filteredArchived, currentArchivedSortKey, currentArchivedSortDirection);
                }
                
                archivedTableFoot.classList.toggle('hidden', filteredArchived.length > 0);
                archivedDocumentsTableBody.innerHTML = '';
                
                archivedDocumentsTable.querySelectorAll('.sort-header').forEach(header => {
                    header.classList.remove('sort-asc', 'sort-desc');
                    if (header.dataset.sortKey === currentArchivedSortKey) {
                        header.classList.add(`sort-${currentArchivedSortDirection}`);
                    }
                });

                filteredArchived.forEach(doc => {
                    const row = archivedDocumentsTableBody.insertRow();
                    
                    const agencyCell = createTableCell(doc.agencyName);
                    if (doc.comments && doc.comments.length > 0) {
                        agencyCell.classList.add('agency-cell-flex');
                        const logButtonHTML = `<button class="renewal-status-button view-log-btn" data-doc-id="${doc.id}">View Log</button>`;
                        agencyCell.innerHTML = `<span>${doc.agencyName}</span>${logButtonHTML}`;
                    }
                    
                    const actionsCell = document.createElement('div');
                    actionsCell.className = 'actions-cell';
                    // MODIFICATION: Check for attachmentPath from the server.
                    if (doc.attachmentPath) {
                        const fileName = doc.attachmentPath.split('/').pop();
                        actionsCell.innerHTML += `<span class="attachment-indicator" data-id="${doc.id}" title="Preview: ${fileName}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81"></path></svg>
                        </span>`;
                    } else {
                        actionsCell.innerHTML += `<span class="attachment-indicator" title="No Attachment">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:1.2rem; height:1.2rem; opacity: 0.5;">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739L16.29 14.825a.75.75 0 00-1.06 0L13.14 17.51a.75.75 0 000 1.06l2.086 2.086a4.5 4.5 0 006.364-6.364l-1.094-1.094zM12.739 18.375L14.825 16.29a.75.75 0 000-1.06L17.51 13.14a.75.75 0 001.06 0l2.086 2.086a4.5 4.5 0 000-6.364L12.739 5.625M.525 5.625L5.625 10.739M10.739 5.625L5.625 10.739M5.625 10.739V5.625" />
                            </svg>
                        </span>`;
                    }

                    row.appendChild(agencyCell);
                    row.appendChild(createTableCell(doc.documentName));
                    row.appendChild(createTableCell(doc.documentNumber));
                    row.appendChild(createTableCell(formatDate(doc.issuanceDate)));
                    row.appendChild(createTableCell(doc.oneTimeIssuance ? 'N/A (One-Time)' : formatDate(doc.expirationDate)));
                    row.appendChild(createTableCell(getLocationNameById(doc.locationId)));
                    row.appendChild(createTableCell(doc.entityName || 'N/A'));
                    row.appendChild(createTableCell(formatDate(doc.archivedAt)));
                    row.appendChild(createTableCell(actionsCell));
                });
            }

                function renderNotifications() {
                notificationsList.innerHTML = '';
                const expiringDocs = documents
                    .map(doc => ({...doc, status: getNotificationStatus(doc)}))
                    .filter(doc => doc.status.type === 'warning' || doc.status.type === 'danger') 
                    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

                if (expiringDocs.length === 0) {
                    notificationsList.innerHTML = '<li>All documents are up-to-date.</li>';
                    return;
                }
                
                expiringDocs.forEach(doc => {
                    const li = document.createElement('li');
                    li.classList.add('clickable');
                    li.dataset.docId = doc.id;
                    const className = doc.status.type === 'danger' ? 'text-red-700' : 'text-custom-green-teal';
                    li.innerHTML = `<span class="${className}"><strong>${doc.documentName}</strong> (${getLocationNameById(doc.locationId)}) ${doc.status.type === 'danger' ? 'has expired' : 'is expiring soon'}.</span>`;
                    notificationsList.appendChild(li);
                });
            }

            function updateComplianceDashboard() {
                complianceDataCache = {}; 
                let overallTotalRequired = 0;
                let overallTotalCompliant = 0;

                locations.forEach(loc => {
                    const requiredDocNames = new Set(locationRequirements[loc.id] || []);
                    const docsForLocation = documents.filter(doc => doc.locationId === loc.id);
                    const presentDocNames = new Set(docsForLocation.map(d => d.documentName));

                    const compliantDocs = [];
                    const expiringDocs = [];
                    const expiredDocs = [];

                    docsForLocation.forEach(doc => {
                        const status = getNotificationStatus(doc);
                        if (status.type === 'success') compliantDocs.push(doc);
                        else if (status.type === 'warning') expiringDocs.push(doc);
                        else if (status.type === 'danger') expiredDocs.push(doc);
                    });
                    
                    const lackingDocs = [...requiredDocNames].filter(reqName => !presentDocNames.has(reqName));

                    const totalRequired = requiredDocNames.size;
                    const totalCompliant = compliantDocs.length;
                    
                    overallTotalRequired += totalRequired;
                    overallTotalCompliant += totalCompliant;

                    const percent = totalRequired > 0 ? Math.round((totalCompliant / totalRequired) * 100) : 0;

                    complianceDataCache[loc.id] = { 
                        compliantDocs, 
                        lackingDocs, 
                        expiredDocs, 
                        expiringDocs, 
                        percent, 
                        name: loc.name
                    };
                });

                const overallPercent = overallTotalRequired > 0 ? Math.round((overallTotalCompliant / overallTotalRequired) * 100) : 0;
                const donutChart = document.getElementById('overall-donut-chart');
                
                // Update Donut Chart
                document.getElementById('donut-chart-percent').textContent = `${overallPercent}%`;
                document.getElementById('donut-chart-ratio').textContent = `${overallTotalCompliant} / ${overallTotalRequired} docs`;
                
                let donutColor = 'var(--color-success)';
                if (overallPercent < 50) {
                    donutColor = 'var(--color-danger)';
                } else if (overallPercent <= 75) {
                    donutColor = 'var(--color-warning)';
                }
                donutChart.style.background = `conic-gradient(${donutColor} ${overallPercent * 3.6}deg, var(--color-border) 0deg)`;

                renderLocationProgressBars();
            }
			
			function renderLocationProgressBars() {
                const locationContainer = document.querySelector('.location-progress-bars');
                locationContainer.innerHTML = ''; 

                let sortedLocations = Object.values(complianceDataCache);

                switch (currentLocationSort) {
                    case 'compliance_asc':
                        sortedLocations.sort((a, b) => a.percent - b.percent);
                        break;
                    case 'compliance_desc':
                        sortedLocations.sort((a, b) => b.percent - a.percent);
                        break;
                    case 'name_asc':
                        sortedLocations.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                }

                sortedLocations.forEach(data => {
                    const locId = locations.find(l => l.name === data.name).id;
                    const percent = data.percent;
                    const totalCompliant = data.compliantDocs.length;
                    const totalRequired = data.lackingDocs.length + data.compliantDocs.length + data.expiredDocs.length + data.expiringDocs.length;
                    
                    let statusClass = 'status-high';
                    if (percent < 50) {
                        statusClass = 'status-low';
                    } else if (percent <= 75) {
                        statusClass = 'status-medium';
                    }
                    
                    // Create the tooltip string
                    const tooltip = `Compliant: ${data.compliantDocs.length}\nLacking: ${data.lackingDocs.length}\nExpired: ${data.expiredDocs.length}\nExpiring Soon: ${data.expiringDocs.length}`;
                    
                    // Add the title attribute to the main div
                    const barHTML = `
                        <div class="location-progress-bar" data-location-id="${locId}" title="${tooltip}">
                            <div class="progress-bar-label">
                                <span>${data.name}</span>
                                <span>${totalCompliant} / ${totalRequired} docs</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar-inner ${statusClass}" style="width: ${percent}%;"></div>
                                <span class="progress-bar-text">${percent}%</span>
                            </div>
                        </div>
                    `;
                    locationContainer.innerHTML += barHTML;
                });
            }

            function openComplianceDetailsModal(locationId) {
                const data = complianceDataCache[locationId];
                if (!data) return;

                const locationName = getLocationNameById(locationId);
                complianceModalTitle.textContent = `Compliance Details: ${locationName}`;

                compliantDocsList.innerHTML = data.compliantDocs.length > 0 
                    ? data.compliantDocs.map(d => `<li data-doc-id="${d.id}" data-doc-type="compliant">${d.documentName}</li>`).join('') 
                    : '<li>None</li>';

                lackingDocsList.innerHTML = data.lackingDocs.length > 0 
                    ? data.lackingDocs.map(name => `<li data-doc-name="${name}" data-location-id="${locationId}" data-doc-type="lacking">${name}</li>`).join('') 
                    : '<li>None</li>';

                expiredDocsList.innerHTML = data.expiredDocs.length > 0 
                    ? data.expiredDocs.map(d => `<li data-doc-id="${d.id}" data-doc-type="expired">${d.documentName} <span style="font-size:0.8em; color: var(--color-danger);"> (Expired: ${formatDate(d.expirationDate)})</span></li>`).join('')
                    : '<li>None</li>';

                expiringDocsList.innerHTML = data.expiringDocs.length > 0 
                    ? data.expiringDocs.map(d => `<li data-doc-id="${d.id}" data-doc-type="expiring">${d.documentName} <span style="font-size:0.8em; color: var(--color-warning);">(Expires: ${formatDate(d.expirationDate)})</span></li>`).join('')
                    : '<li>None</li>';

                complianceDetailsModal.classList.add('active');
            }

            function closeComplianceDetailsModal() {
                complianceDetailsModal.classList.remove('active');
            }
			
			function openStatusLogModal(doc, isReadOnly = false) {
                statusLogTitle.innerHTML = `Renewal Status Log<br><small style="font-weight: normal; font-size: 0.9rem; color: var(--color-text-secondary);">${doc.documentName} at ${getLocationNameById(doc.locationId)}</small>`;
                newCommentForm.dataset.docId = doc.id;
                commentHistoryList.innerHTML = ''; // Clear previous
                
                // Hide or show the form based on read-only status
                newCommentForm.style.display = isReadOnly ? 'none' : 'block';

                if (doc.comments && doc.comments.length > 0) {
                    const sortedComments = [...doc.comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    sortedComments.forEach(comment => {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <div class="comment-meta">
                                <span>${new Date(comment.timestamp).toLocaleString()}</span> - <strong>${comment.commentor}</strong>
                            </div>
                            <p class="comment-text">${comment.text}</p>
                        `;
                        commentHistoryList.appendChild(li);
                    });
                } else {
                    commentHistoryList.innerHTML = '<li>No log entries yet.</li>';
                }
                
                statusLogModal.classList.add('active');
                if (!isReadOnly) {
                    newCommentText.focus();
                }
            }

            function closeStatusLogModal() {
                statusLogModal.classList.remove('active', 'modal-on-top'); // <-- MODIFIED LINE
                newCommentForm.reset();
                delete newCommentForm.dataset.docId;
            }
			
			function openNotificationActionModal(doc) {
                notificationActionTitle.textContent = 'Action For:';
                notificationActionContent.innerHTML = `<strong>${doc.documentName}</strong><br><small>(${getLocationNameById(doc.locationId)})</small>`;
                actionViewStatusBtn.dataset.docId = doc.id;
                actionRenewBtn.dataset.docId = doc.id;
                notificationActionModal.classList.add('active');
            }

            function closeNotificationActionModal() {
                notificationActionModal.classList.remove('active');
            }
			
			function generateComplianceReport(locationIds) {
                const reportWindow = window.open('', '_blank');
                let reportHtml = `
                    <html>
                    <head>
                        <title>Compliance Status Report</title>
                        <style>
                            @page { size: A4; margin: 2cm; }
                            body { font-family: 'Inter', sans-serif; font-size: 10pt; }
                            .report-page { page-break-before: always; }
                            .report-page:first-child { page-break-before: avoid; }
                            h1 { font-size: 18pt; margin-bottom: 0; }
                            h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 2rem; }
                            h3 { font-size: 11pt; margin-top: 1.5rem; margin-bottom: 0.5rem; }
                            ul { list-style-type: none; padding-left: 10px; }
                            li { margin-bottom: 4px; }
                            .summary-table { border-collapse: collapse; width: 50%; margin-top: 1rem; }
                            .summary-table td { border: 1px solid #ddd; padding: 6px; }
                            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; }
                            .header-text p { margin: 0; }
                            .logo { font-size: 16pt; font-weight: 700; color: #FF8C00; }
                        </style>
                    </head>
                    <body>`;

                locationIds.forEach(locId => {
                    const data = complianceDataCache[locId];
                    if (!data) return;

                    const locationName = getLocationNameById(locId);
                    const totalRequired = data.lackingDocs.length + data.compliantDocs.length + data.expiredDocs.length + data.expiringDocs.length;

                    reportHtml += `
                        <div class="report-page">
                            <div class="header">
                                <div class="header-text">
                                    <h1>Compliance Status Report</h1>
                                    <p>Generated on: ${new Date().toLocaleString()}</p>
                                </div>
                                <div class="logo">FMG</div>
                            </div>
                            <h2>Location: ${locationName}</h2>
                            <table class="summary-table">
                                <tr><td>Overall Compliance</td><td><strong>${data.percent}%</strong></td></tr>
                                <tr><td>Compliant Documents</td><td>${data.compliantDocs.length} of ${totalRequired}</td></tr>
                                <tr><td>Non-Compliant Documents</td><td>${data.lackingDocs.length + data.expiredDocs.length + data.expiringDocs.length}</td></tr>
                            </table>

                            <h3>Compliant Documents (${data.compliantDocs.length})</h3>
                            <ul>${data.compliantDocs.length > 0 ? data.compliantDocs.map(d => `<li>${d.documentName}</li>`).join('') : '<li>None</li>'}</ul>
                            
                            <h3>Non-Compliant Documents</h3>
                            <h4>Lacking (${data.lackingDocs.length})</h4>
                            <ul>${data.lackingDocs.length > 0 ? data.lackingDocs.map(name => `<li>${name}</li>`).join('') : '<li>None</li>'}</ul>
                            
                            <h4>Expired (${data.expiredDocs.length})</h4>
                            <ul>${data.expiredDocs.length > 0 ? data.expiredDocs.map(d => `<li>${d.documentName} (Expired: ${formatDate(d.expirationDate)})</li>`).join('') : '<li>None</li>'}</ul>

                            <h4>Expiring Soon (${data.expiringDocs.length})</h4>
                            <ul>${data.expiringDocs.length > 0 ? data.expiringDocs.map(d => `<li>${d.documentName} (Expires: ${formatDate(d.expirationDate)})</li>`).join('') : '<li>None</li>'}</ul>
                        </div>
                    `;
                });

                reportHtml += `</body></html>`;
                reportWindow.document.write(reportHtml);
                reportWindow.document.close();
                reportWindow.print();
            }


            function updateUI() {
                renderLocations();
                populateArchivedFilters(); 
                updateComplianceDashboard();
                renderMainDocumentsTable();
                renderArchivedDocumentsTable();
                renderNotifications();
            }

            function renderLocations() {
                const selectedVal = locationSelect.value;
                locationSelect.innerHTML = '<option value="">All Locations</option>';
                formLocationSelect.innerHTML = '<option value="">Select a location</option>';
                filterArchivedLocationSelect.innerHTML = '<option value="">All Locations</option>';

                locations.forEach(loc => {
                    const option = new Option(loc.name, loc.id);
                    locationSelect.add(option.cloneNode(true));
                    formLocationSelect.add(option.cloneNode(true));
                    filterArchivedLocationSelect.add(option);
                });
                locationSelect.value = selectedVal;
            }

            function populateArchivedFilters() {
                const years = new Set();
                archivedDocuments.forEach(doc => {
                    if (doc.archivedAt) {
                        years.add(new Date(doc.archivedAt).getFullYear());
                    }
                });
                const sortedYears = Array.from(years).sort((a, b) => b - a);

                filterArchivedYearSelect.innerHTML = '<option value="">All Years</option>';
                sortedYears.forEach(year => {
                    filterArchivedYearSelect.add(new Option(year, year));
                });
            }

            function updateDocumentNameOptions(agency, selectedDocName = null) {
                formDocumentNameSelect.innerHTML = '<option value="">Select a Document Name</option>';
                const options = (agency === "Other") ? ["Other"] : (documentNameOptions[agency] || []);
                
                options.forEach(opt => {
                    formDocumentNameSelect.add(new Option(opt, opt));
                });

                if (selectedDocName) {
                    const isPredefined = options.includes(selectedDocName);
                    if (isPredefined) {
                        formDocumentNameSelect.value = selectedDocName;
                    } else if (options.length > 0) {
                        formDocumentNameSelect.value = 'Other';
                        formDocumentNameOtherInput.value = selectedDocName;
                        formDocumentNameOtherInput.classList.remove('hidden');
                    }
                }
            }
            
            function updateEntityNameOptions(locationId, selectedEntityName = null) {
                formEntityNameSelect.innerHTML = '<option value="">Select an Entity</option>';
                const options = entityNameOptions[locationId] || [];
                options.forEach(opt => {
                    formEntityNameSelect.add(new Option(opt, opt));
                });

                if (selectedEntityName) {
                    const isPredefined = options.includes(selectedEntityName);
                    if (isPredefined) {
                        formEntityNameSelect.value = selectedEntityName;
                    } else if (options.length > 0) {
                        formEntityNameSelect.value = 'Other';
                        formEntityNameOtherInput.value = selectedEntityName;
                        formEntityNameOtherInput.classList.remove('hidden');
                    }
                }
            }

            function openDocumentModal(docToEdit = null, isRenewal = false, prefillData = null) {
                documentForm.reset();
                Object.values(formErrorElements).forEach(el => el.classList.add('hidden'));
                formAgencyNameOtherInput.classList.add('hidden');
                formDocumentNameOtherInput.classList.add('hidden');
                formEntityNameOtherInput.classList.add('hidden');
                
                const submitButton = documentForm.querySelector('button[type="submit"]');
                originalRenewalExpirationDate = null;

                if (prefillData) {
                    modalTitle.textContent = 'Add New Document';
                    submitButton.textContent = 'Add Document';
                    submitButton.id = 'saveDocumentBtn';
                    
                    formLocationSelect.value = prefillData.locationId;
                    formAgencyNameSelect.value = prefillData.agencyName;
                    updateDocumentNameOptions(prefillData.agencyName, prefillData.documentName);
                    updateEntityNameOptions(prefillData.locationId);
                    
                } else if (docToEdit) {
                    modalTitle.textContent = isRenewal ? 'Renew Document' : 'Edit Document';
                    submitButton.textContent = isRenewal ? 'Renew Document' : 'Save Changes';
                    submitButton.id = isRenewal ? 'renew-confirm-form' : 'saveDocumentBtn';

                    document.getElementById('form-document-id').value = isRenewal ? '' : docToEdit.id;
                    
                    const isPredefinedAgency = Array.from(formAgencyNameSelect.options).some(opt => opt.value === docToEdit.agencyName);
                    if (isPredefinedAgency) {
                        formAgencyNameSelect.value = docToEdit.agencyName;
                    } else {
                        formAgencyNameSelect.value = 'Other';
                        formAgencyNameOtherInput.value = docToEdit.agencyName;
                        formAgencyNameOtherInput.classList.remove('hidden');
                    }

                    updateDocumentNameOptions(formAgencyNameSelect.value, docToEdit.documentName);
                    
                    formLocationSelect.value = docToEdit.locationId;
                    updateEntityNameOptions(docToEdit.locationId, docToEdit.entityName);

                    document.getElementById('form-document-number').value = docToEdit.documentNumber;
                    document.getElementById('form-issuance-date').value = docToEdit.issuanceDate;
                    
                    if (addOneTimeCheckbox) {
                        addOneTimeCheckbox.checked = !!docToEdit.oneTimeIssuance;
                        if (addOneTimeCheckbox.checked) {
                            addExpInput.disabled = true;
                            addExpInput.removeAttribute('required');
                            addExpInput.style.backgroundColor = '#eee';
                            addExpInput.style.color = '#666';
                            addExpInput.value = '';
                        } else {
                            addExpInput.disabled = false;
                            addExpInput.setAttribute('required', 'true');
                            addExpInput.style.backgroundColor = '';
                            addExpInput.style.color = '';
                            document.getElementById('form-expiration-date').value = docToEdit.expirationDate;
                        }
                    } else {
                         document.getElementById('form-expiration-date').value = docToEdit.expirationDate;
                    }

                    if (isRenewal) {
                        originalRenewalExpirationDate = docToEdit.expirationDate;
                        document.getElementById('form-agency-name').disabled = true;
                        document.getElementById('form-agency-name-other').disabled = true;
                        document.getElementById('form-document-name').disabled = true;
                        document.getElementById('form-document-name-other').disabled = true;
                        document.getElementById('form-location').disabled = true;
                        document.getElementById('form-entity-name').disabled = true;
                        document.getElementById('form-entity-name-other').disabled = true;

                        document.getElementById('form-document-number').disabled = false;
                        document.getElementById('form-issuance-date').disabled = false;
                        document.getElementById('form-upload-document').disabled = false;
                        document.getElementById('deleteAttachmentBtn').disabled = false;
                        addOneTimeCheckbox.disabled = false;
                    } else {
                        document.getElementById('form-agency-name').disabled = false;
                        document.getElementById('form-agency-name-other').disabled = false;
                        document.getElementById('form-document-name').disabled = false;
                        document.getElementById('form-document-name-other').disabled = false;
                        document.getElementById('form-document-number').disabled = false;
                        document.getElementById('form-issuance-date').disabled = false;
                        document.getElementById('form-location').disabled = false;
                        document.getElementById('form-entity-name').disabled = false;
                        document.getElementById('form-entity-name-other').disabled = false;
                        document.getElementById('form-upload-document').disabled = false;
                        document.getElementById('deleteAttachmentBtn').disabled = false;
                        addOneTimeCheckbox.disabled = false;
                    }


                    // MODIFICATION: Use attachmentPath from server
                    document.getElementById('form-attachment-data').value = docToEdit.attachmentPath || ''; // Store the path
                    const fileName = docToEdit.attachmentPath ? docToEdit.attachmentPath.split('/').pop() : '';
                    document.getElementById('form-attachment-name').value = fileName; // Store just the name
                    currentAttachmentP.textContent = fileName ? `Current: ${fileName}` : 'No file attached.';
                    if(fileName){ document.getElementById('deleteAttachmentBtn').classList.remove('hidden');
                document.getElementById('form-upload-document').value = ''; }
                } else {
                    modalTitle.textContent = 'Add New Document';
                    submitButton.textContent = 'Add Document';
                    submitButton.id = 'saveDocumentBtn';
                    currentAttachmentP.textContent = 'No file attached.';
                    document.getElementById('deleteAttachmentBtn').classList.add('hidden');
                    document.getElementById('form-upload-document').value = '';
                    updateDocumentNameOptions('');
                    updateEntityNameOptions('');

                    if (addOneTimeCheckbox) {
                        addOneTimeCheckbox.checked = false;
                        addExpInput.disabled = false;
                        addExpInput.setAttribute('required', 'true');
                        addExpInput.style.backgroundColor = '';
                        addExpInput.style.color = '';
                    }

                    document.getElementById('form-agency-name').disabled = false;
                    document.getElementById('form-agency-name-other').disabled = false;
                    document.getElementById('form-document-name').disabled = false;
                    document.getElementById('form-document-name-other').disabled = false;
                    document.getElementById('form-document-number').disabled = false;
                    document.getElementById('form-issuance-date').disabled = false;
                    document.getElementById('form-location').disabled = false;
                    document.getElementById('form-entity-name').disabled = false;
                    document.getElementById('form-entity-name-other').disabled = false;
                    document.getElementById('form-upload-document').disabled = false;
                    document.getElementById('deleteAttachmentBtn').disabled = false;
                    addOneTimeCheckbox.disabled = false;
                }

                documentModal.classList.add('active');
                document.getElementById('form-agency-name').focus();
            }

            function closeDocumentModal() {
                documentModal.classList.remove('active', 'modal-on-top'); // <-- MODIFIED LINE
                sessionStorage.removeItem('renewingDocId');
                originalRenewalExpirationDate = null;
            }
            
            function openRenewModal() {
                const docsForRenewal = documents.filter(doc => {
                    const status = getNotificationStatus(doc);
                    return status.type === 'warning' || status.type === 'danger';
                });

                renewDocSelect.innerHTML = '<option value="">--Please choose an option--</option>';
                if (docsForRenewal.length === 0) {
                     renewDocSelect.innerHTML = '<option value="" disabled>No documents to renew</option>';
                } else {
                    docsForRenewal.forEach(doc => {
                        renewDocSelect.add(new Option(`${doc.documentName} (${doc.agencyName})`, doc.id));
                    });
                }
                renewConfirmBtn.disabled = true;
                renewModal.classList.add('active');
            }
            
            function closeRenewModal() {
                renewModal.classList.remove('active');
            }

            function validateForm() {
                let isValid = true;
                Object.values(formErrorElements).forEach(el => el.classList.add('hidden'));
                const fieldsToValidate = {
                    'document-number': 'Document Number', 'issuance-date': 'Date of Issuance',
                    'location': 'Office Location'
                };
                const _oneTimeCb = document.getElementById('oneTimeIssuanceCheckbox');
                const _skipExpiry = !!(_oneTimeCb && _oneTimeCb.checked);
                if (!_skipExpiry) {
                    fieldsToValidate['expiration-date'] = 'Date of Expiration';
                }

                if (formAgencyNameSelect.value === '') {
                    formErrorElements['agency-name'].textContent = 'Government Agency is required.';
                    formErrorElements['agency-name'].classList.remove('hidden');
                    isValid = false;
                } else if (formAgencyNameSelect.value === 'Other' && !formAgencyNameOtherInput.value.trim()) {
                    formErrorElements['agency-name'].textContent = 'Please specify the agency name.';
                    formErrorElements['agency-name'].classList.remove('hidden');
                    isValid = false;
                }

                if (formDocumentNameSelect.value === '') {
                    formErrorElements['document-name'].textContent = 'Document Name is required.';
                    formErrorElements['document-name'].classList.remove('hidden');
                    isValid = false;
                } else if (formDocumentNameSelect.value === 'Other' && !formDocumentNameOtherInput.value.trim()) {
                    formErrorElements['document-name'].textContent = 'Please specify the document name.';
                    formErrorElements['document-name'].classList.remove('hidden');
                    isValid = false;
                }

                if (formEntityNameSelect.value === '') {
                    formErrorElements['entity-name'].textContent = 'Entity Name is required.';
                    formErrorElements['entity-name'].classList.remove('hidden');
                    isValid = false;
                } else if (formEntityNameSelect.value === 'Other' && !formEntityNameOtherInput.value.trim()) {
                    formErrorElements['entity-name'].textContent = 'Please specify the entity name.';
                    formErrorElements['entity-name'].classList.remove('hidden');
                    isValid = false;
                }

                for (const id in fieldsToValidate) {
                    const input = document.getElementById(`form-${id}`);
                    if (!input.value.trim()) {
                        formErrorElements[id].textContent = `${fieldsToValidate[id]} is required.`;
                        formErrorElements[id].classList.remove('hidden');
                        isValid = false;
                    }
                }
                
                const issueDate = document.getElementById('form-issuance-date').value;
                const expiryDate = document.getElementById('form-expiration-date').value;
                if (!_skipExpiry && issueDate && expiryDate && new Date(issueDate) >= new Date(expiryDate)) {
                    formErrorElements['date-order'].textContent = 'Expiration Date must be after Issuance Date.';
                    formErrorElements['date-order'].classList.remove('hidden');
                    isValid = false;
                }

                if (originalRenewalExpirationDate && expiryDate) {
                    const newExpDate = new Date(expiryDate);
                    const oldExpDate = new Date(originalRenewalExpirationDate);
                    newExpDate.setUTCHours(0, 0, 0, 0);
                    oldExpDate.setUTCHours(0, 0, 0, 0);

                    if (newExpDate <= oldExpDate) {
                        formErrorElements['renewal-date'].textContent = 'New expiration date must be later than the current expiration date.';
                        formErrorElements['renewal-date'].classList.remove('hidden');
                        isValid = false;
                    }
                }
                return isValid;
            }
            
            async function handleSaveDocument(e) {
                e.preventDefault();
                if (!validateForm()) return;
                
                const fileInput = document.getElementById('form-upload-document');
                const file = fileInput.files[0];
                if (file && (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)) {
                    displayGlobalMessage(`File is too large. Please select a file under ${MAX_FILE_SIZE_MB} MB.`, 'error');
                    fileInput.value = '';
                    return;
                }

                const docId = document.getElementById('form-document-id').value;
                const isOneTimeIssuance = addOneTimeCheckbox ? addOneTimeCheckbox.checked : false;
                
                let agencyName = formAgencyNameSelect.value;
                if (agencyName === 'Other') agencyName = formAgencyNameOtherInput.value.trim();

                let documentName = formDocumentNameSelect.value;
                if (documentName === 'Other') documentName = formDocumentNameOtherInput.value.trim();

                let entityName = formEntityNameSelect.value;
                if (entityName === 'Other') entityName = formEntityNameOtherInput.value.trim();

                // Build the document object to be sent to the server
                const docData = {
                    id: docId || generateUUID(),
                    agencyName: agencyName,
                    documentName: documentName,
                    entityName: entityName,
                    documentNumber: document.getElementById('form-document-number').value.trim(),
                    issuanceDate: document.getElementById('form-issuance-date').value,
                    expirationDate: isOneTimeIssuance ? null : document.getElementById('form-expiration-date').value,
                    locationId: document.getElementById('form-location').value,
                    oneTimeIssuance: isOneTimeIssuance,
                    // IMPORTANT: Include the existing attachment path for edits.
                    // The server will replace this if a new file is uploaded.
                    attachmentPath: document.getElementById('form-attachment-data').value,
                    comments: (docId && documents.find(d => d.id === docId)?.comments) || []
                };

                const formData = new FormData();
                formData.append('document', JSON.stringify(docData));

                // If a new file has been selected, add it to the form data.
                if (file) {
                    formData.append('attachment', file);
                }

               // If this is a renewal, add the ID of the document being replaced.
                const originalDocId = sessionStorage.getItem('renewingDocId');
                if (originalDocId) {
                    // This is the crucial connection to the new server logic.
                    formData.append('originalDocId', originalDocId);
                }

                // Use the new server communication function
                await postDocumentToServer(formData);

                sessionStorage.removeItem('renewingDocId');
                closeDocumentModal();
            }

            async function deleteDocument(docId) {
                try {
                    const response = await fetch(`/api/documents/${docId}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Server error on deletion.');
                    }
                    
                    displayGlobalMessage('Document permanently deleted!', 'success');
                    await fetchDataFromServer(); // Re-fetch data to update UI

                } catch (error) {
                    console.error('Error deleting document:', error);
                    displayGlobalMessage(`Failed to delete document: ${error.message}`);
                }
            }

            function downloadAttachment(docId) {
                const doc = documents.find(d => d.id === docId) || archivedDocuments.find(d => d.id === docId);
                // MODIFICATION: Use the attachmentPath (URL)
                if (doc && doc.attachmentPath) {
                    const link = document.createElement('a');
                    link.href = doc.attachmentPath; // The path is the direct URL to the file
                    link.download = doc.attachmentPath.split('/').pop(); // Set a download filename
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    displayGlobalMessage('Attachment not found.');
                }
            }

            function openPreviewModal(doc) {
                const fileName = doc.attachmentPath ? doc.attachmentPath.split('/').pop() : 'File';
                previewModalTitle.textContent = `Preview: ${doc.documentName} - ${fileName}`;
                previewContent.innerHTML = '';
                currentPreviewScale = 1;

                const attachmentUrl = doc.attachmentPath;
                const isImage = /\.(jpe?g|png|gif|svg|webp)$/i.test(attachmentUrl);
                const isPdf = /\.pdf$/i.test(attachmentUrl);

                zoomInBtn.classList.toggle('hidden', !isImage);
                zoomOutBtn.classList.toggle('hidden', !isImage);

                if (isImage) {
                    const img = document.createElement('img');
                    img.src = attachmentUrl; // The path is a direct URL
                    img.alt = fileName;
                    img.style.transform = `scale(${currentPreviewScale})`;
                    previewContent.appendChild(img);
                } else if (isPdf) {
                    const iframe = document.createElement('iframe');
                    iframe.src = attachmentUrl; // The path is a direct URL
                    previewContent.appendChild(iframe);
                } else {
                    previewContent.innerHTML = `<p style="text-align:center; padding:20px;">No direct preview available. Please use the download button.</p>`;
                }

                downloadPreviewBtn.onclick = () => downloadAttachment(doc.id);
                previewModal.classList.add('active');
            }

            function closePreviewModal() {
                previewModal.classList.remove('active');
                previewContent.innerHTML = '';
                downloadPreviewBtn.onclick = null;
                currentPreviewScale = 1;
            }

            function zoomPreview(factor) {
                const previewElement = previewContent.querySelector('img');
                if (previewElement) {
                    currentPreviewScale = Math.max(0.1, currentPreviewScale + factor);
                    previewElement.style.transform = `scale(${currentPreviewScale})`;
                }
            }

            function toggleTheme() {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const newTheme = isDark ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem(LOCAL_STORAGE_KEY_THEME, newTheme);
                updateThemeIcons(newTheme);
                updateButtonLabel(newTheme);
            }

            function updateThemeIcons(theme) {
                moonIcon.classList.toggle('hidden', theme !== 'dark');
                sunIcon.classList.toggle('hidden', theme === 'dark');
            }

            function updateButtonLabel(theme) {
                const themeLabel = document.querySelector('.theme-label');
                const themeSwitcher = document.getElementById('theme-switcher');
                if (theme === 'dark') {
                    themeLabel.textContent = 'Light Mode';
                    themeSwitcher.setAttribute('aria-label', 'Activate light mode');
                } else {
                    themeLabel.textContent = 'Dark Mode';
                    themeSwitcher.setAttribute('aria-label', 'Activate dark mode');
                }
            }

            function createDocNameToAgencyMap() {
                for (const agency in documentNameOptions) {
                    for (const docName of documentNameOptions[agency]) {
                        if (docName !== 'Other') {
                            docNameToAgencyMap[docName] = agency;
                        }
                    }
                }
            }
            
            function initializeApp() {
                locations = loadDataFromLocalStorage(LOCAL_STORAGE_KEY_LOCATIONS);
                if (locations.length === 0) {
                    locations = PREDEFINED_LOCATIONS;
                    saveDataToLocalStorage(LOCAL_STORAGE_KEY_LOCATIONS, locations);
                }
                
                // MODIFICATION: Fetch data from server instead of localStorage
                fetchDataFromServer();
                
                createDocNameToAgencyMap();
                
                const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
                updateThemeIcons(savedTheme);
                updateButtonLabel(savedTheme);

                const isArchivedVisible = localStorage.getItem(LOCAL_STORAGE_KEY_ARCHIVE_VISIBILITY) === 'true';
                document.getElementById('archived-table-content').classList.toggle('hidden', !isArchivedVisible);

                const isAboutPanelExpanded = localStorage.getItem(LOCAL_STORAGE_KEY_ABOUT_PANEL_VISIBILITY) === 'true';
                aboutPanelContent.classList.toggle('expanded', isAboutPanelExpanded);
                toggleAboutPanelBtn.classList.toggle('rotated', isAboutPanelExpanded);
                aboutPanelHeader.setAttribute('aria-expanded', isAboutPanelExpanded);

                updateUI();
            }

            function openDeleteModal(docId) {
                sessionStorage.setItem('deletingDocId', docId);
                document.getElementById('deleteModal').classList.add('active');
            }
            
            function closeDeleteModal() {
                document.getElementById('deleteModal').classList.remove('active');
                sessionStorage.removeItem('deletingDocId');
            }

            function openDeleteAttachmentModal() {
                document.getElementById('deleteAttachmentModal').classList.add('active');
            }
            
            function closeDeleteAttachmentModal() {
                document.getElementById('deleteAttachmentModal').classList.remove('active');
            }
            
            function confirmDeleteAttachment() {
                document.getElementById('form-attachment-data').value = ''; // This input now holds the path
                document.getElementById('form-attachment-name').value = '';
                document.getElementById('current-attachment').textContent = 'No file attached.';
                document.getElementById('deleteAttachmentBtn').classList.add('hidden');
                document.getElementById('form-upload-document').value = '';
                closeDeleteAttachmentModal();
                displayGlobalMessage('Attachment removed successfully!', 'success');
            }


            function confirmDelete() {
                const docId = sessionStorage.getItem('deletingDocId');
                if (docId) deleteDocument(docId);
                closeDeleteModal();
            }

            function highlightAndScrollToRow(docId) {
                const doc = documents.find(d => d.id === docId);
                if (!doc) return;

                locationSelect.value = doc.locationId;
                filterDocumentNameInput.value = doc.documentName;
                renderMainDocumentsTable();

                // Wait for table to render
                setTimeout(() => {
                    const rowToHighlight = documentsTableBody.querySelector(`[data-doc-id='${docId}']`);
                    if (rowToHighlight) {
                        manageDocumentsSection.scrollIntoView({ behavior: 'smooth' });
                        rowToHighlight.classList.add('row-highlight');
                        setTimeout(() => rowToHighlight.classList.remove('row-highlight'), 2500);
                    } else {
                        // Reset filter if not found
                        filterDocumentNameInput.value = '';
                        renderMainDocumentsTable();
                    }
                }, 100);
            }

            // --- Event Listeners ---

            document.getElementById('form-upload-document').addEventListener('change', (e) => {
                const fileInput = e.target;
                const file = fileInput.files[0];
                const currentAttachmentP = document.getElementById('current-attachment');
                if (file) {
                    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                        displayGlobalMessage(`File is too large. Please select a file under ${MAX_FILE_SIZE_MB} MB.`, 'error');
                        fileInput.value = '';
                        return;
                    }
                    currentAttachmentP.textContent = `Selected: ${file.name}`;
                    document.getElementById('deleteAttachmentBtn').classList.remove('hidden');
                    document.getElementById('form-attachment-data').value = '';
                    document.getElementById('form-attachment-name').value = file.name;
                } else {
                    currentAttachmentP.textContent = 'No file attached.';
                    document.getElementById('deleteAttachmentBtn').classList.add('hidden');
                    document.getElementById('form-upload-document').value = '';
                    document.getElementById('form-attachment-data').value = '';
                    document.getElementById('form-attachment-name').value = '';
                }
            });


            document.getElementById('deleteAttachmentBtn').addEventListener('click', openDeleteAttachmentModal);
            document.getElementById('closeDeleteAttachmentModalBtn').addEventListener('click', closeDeleteAttachmentModal);
            document.getElementById('delete-attachment-cancel').addEventListener('click', closeDeleteAttachmentModal);
            document.getElementById('delete-attachment-confirm').addEventListener('click', confirmDeleteAttachment);


            document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
            document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
            document.getElementById('delete-confirm').addEventListener('click', confirmDelete);

            
            [locationSelect, ...filterInputs].forEach(el => el.addEventListener('change', renderMainDocumentsTable));
            [filterAgencyNameInput, filterDocumentNameInput].forEach(el => el.addEventListener('input', renderMainDocumentsTable));
            [filterArchivedAgencyInput, filterArchivedDocumentInput, filterArchivedLocationSelect, filterArchivedYearSelect].forEach(el => el.addEventListener('input', renderArchivedDocumentsTable));
            [filterArchivedLocationSelect, filterArchivedYearSelect].forEach(el => el.addEventListener('change', renderArchivedDocumentsTable));
            
            addDocumentBtn.addEventListener('click', () => openDocumentModal());
            renewDocumentBtn.addEventListener('click', openRenewModal);
            
            documentForm.addEventListener('submit', handleSaveDocument);
            cancelDocumentBtn.addEventListener('click', closeDocumentModal);
            closeModalBtn.addEventListener('click', closeDocumentModal);
            documentModal.addEventListener('click', e => e.target === documentModal && closeDocumentModal()); 

            formAgencyNameSelect.addEventListener('change', (e) => {
                updateDocumentNameOptions(e.target.value);
                formAgencyNameOtherInput.classList.toggle('hidden', e.target.value !== 'Other');
                if(e.target.value === 'Other') formAgencyNameOtherInput.focus();
            });

            formDocumentNameSelect.addEventListener('change', (e) => {
                formDocumentNameOtherInput.classList.toggle('hidden', e.target.value !== 'Other');
                if(e.target.value === 'Other') formDocumentNameOtherInput.focus();
            });

            formLocationSelect.addEventListener('change', (e) => updateEntityNameOptions(e.target.value));

            formEntityNameSelect.addEventListener('change', (e) => {
                formEntityNameOtherInput.classList.toggle('hidden', e.target.value !== 'Other');
                if(e.target.value === 'Other') formEntityNameOtherInput.focus();
            });
            
            renewDocSelect.addEventListener('change', () => {
                renewConfirmBtn.disabled = !renewDocSelect.value;
                const selectedDoc = documents.find(d => d.id === renewDocSelect.value);
                renewLocationInfo.textContent = selectedDoc ? `Current Expiry: ${formatDate(selectedDoc.expirationDate)} at ${getLocationNameById(selectedDoc.locationId)}` : '';
            });
            
            renewConfirmBtn.addEventListener('click', () => {
                const selectedDocId = renewDocSelect.value;
                if (!selectedDocId) return displayGlobalMessage('Please select a document to renew.', 'error');
                
                if (window.confirm('Are you sure you want to renew this document?')) {
                    const docToRenew = documents.find(d => d.id === selectedDocId);
                    if (docToRenew) {
                        sessionStorage.setItem('renewingDocId', selectedDocId);
                        closeRenewModal();
                        openDocumentModal(docToRenew, true);
                    } else {
                        displayGlobalMessage('Error: Could not find the selected document to renew.');
                    }
                }
            });
            renewCancelBtn.addEventListener('click', closeRenewModal);
            closeRenewModalBtn.addEventListener('click', closeRenewModal);
            renewModal.addEventListener('click', e => e.target === renewModal && closeRenewModal());
            
            documentsTableBody.addEventListener('click', e => {
                const target = e.target;
                const button = target.closest('button');
                const attachmentIndicator = target.closest('.attachment-indicator');

                // Handle attachment preview click
                if (attachmentIndicator) {
                    const docId = attachmentIndicator.dataset.id;
                    const doc = documents.find(d => d.id === docId);
                    if (doc && doc.attachmentPath) openPreviewModal(doc);
                    else if (doc) displayGlobalMessage('No attachment available for this document.', 'info');
                    return;
                }

                if (!button) return; // Exit if the click was not on any button

                // Handle log status button click
                if (button.classList.contains('renewal-status-button')) {
                    const docId = button.dataset.docId;
                    const doc = documents.find(d => d.id === docId);
                    if (doc) {
                        openStatusLogModal(doc);
                    }
                    return;
                }
                
                // Handle disabled buttons
                if (button.disabled) return;

                // Handle Edit and Delete buttons
                const docId = button.dataset.id;
                if (button.classList.contains('delete-button-icon')) {
                    openDeleteModal(docId);
                } else if (button.classList.contains('edit-button-icon')) {
                    const docToEdit = documents.find(d => d.id === docId);
                    if (docToEdit) openDocumentModal(docToEdit);
                }
            });

            archivedDocumentsTableBody.addEventListener('click', e => {
                const attachmentIndicator = e.target.closest('.attachment-indicator');
                const logButton = e.target.closest('.view-log-btn');

                if (attachmentIndicator) {
                    const docId = attachmentIndicator.dataset.id;
                    const doc = archivedDocuments.find(d => d.id === docId);
                    if (doc && doc.attachmentPath) {
                        openPreviewModal(doc);
                    } else if (doc) {
                        displayGlobalMessage('No attachment available for this document.', 'info');
                    }
                    return;
                }

                if (logButton) {
                    const docId = logButton.dataset.docId;
                    const doc = archivedDocuments.find(d => d.id === docId);
                    if (doc) {
                        openStatusLogModal(doc, true); // Open in read-only mode
                    }
                }
            });

            documentsTable.querySelector('thead').addEventListener('click', e => {
                const header = e.target.closest('th[data-sort-key]');
                if (header) {
                    const key = header.dataset.sortKey;
                    if (currentMainSortKey === key) {
                        currentMainSortDirection = currentMainSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentMainSortKey = key;
                        currentMainSortDirection = 'asc';
                    }
                    renderMainDocumentsTable();
                }
            });
            
            archivedDocumentsTable.querySelector('thead').addEventListener('click', e => {
                const header = e.target.closest('th[data-sort-key]');
                if (header) {
                    const key = header.dataset.sortKey;
                    if (currentArchivedSortKey === key) {
                        currentArchivedSortDirection = currentArchivedSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentArchivedSortKey = key;
                        currentArchivedSortDirection = 'asc';
                    }
                    renderArchivedDocumentsTable();
                }
            });

            themeSwitcher.addEventListener('click', toggleTheme);
            
            toggleArchivedTableBtn.addEventListener('click', () => {
                const container = document.getElementById('archived-table-content');
                const isHidden = container.classList.toggle('hidden');
                localStorage.setItem(LOCAL_STORAGE_KEY_ARCHIVE_VISIBILITY, !isHidden);
            });

            aboutPanelHeader.addEventListener('click', () => {
                const isExpanded = aboutPanelContent.classList.toggle('expanded');
                toggleAboutPanelBtn.classList.toggle('rotated', isExpanded);
                aboutPanelHeader.setAttribute('aria-expanded', isExpanded);
                localStorage.setItem(LOCAL_STORAGE_KEY_ABOUT_PANEL_VISIBILITY, isExpanded);
            });

            closePreviewModalBtn.addEventListener('click', closePreviewModal);
            previewModal.addEventListener('click', e => e.target === previewModal && closePreviewModal());
            zoomInBtn.addEventListener('click', () => zoomPreview(0.1));
            zoomOutBtn.addEventListener('click', () => zoomPreview(-0.1));

            document.querySelector('.compliance-dashboard').addEventListener('click', (e) => {
                const progressBarWrapper = e.target.closest('.progress-bar-container, .location-progress-bar');
                if (progressBarWrapper && progressBarWrapper.dataset.locationId !== 'overall') {
                    openComplianceDetailsModal(progressBarWrapper.dataset.locationId);
                }
            });

            closeComplianceModalBtn.addEventListener('click', closeComplianceDetailsModal);
            complianceDetailsModal.addEventListener('click', e => {
                 if (e.target === complianceDetailsModal) {
                    closeComplianceDetailsModal();
                    return;
                }
                const listItem = e.target.closest('li');
                if (!listItem || !listItem.dataset.docType) return;

                const { docId, docName, locationId, docType } = listItem.dataset;
                
                if (docType === 'compliant') {
                    closeComplianceDetailsModal();
                    highlightAndScrollToRow(docId);
                } else if (docType === 'lacking') {
                    const prefillData = {
                        documentName: docName,
                        locationId: locationId,
                        agencyName: docNameToAgencyMap[docName] || ''
                    };
                    closeComplianceDetailsModal();
                    openDocumentModal(null, false, prefillData);
                } else if (docType === 'expired' || docType === 'expiring') {
                    const docToRenew = documents.find(d => d.id === docId);
                    if (docToRenew) {
                        sessionStorage.setItem('renewingDocId', docId);
                        closeComplianceDetailsModal();
                        openDocumentModal(docToRenew, true);
                    }
                }
            });
			
			locationSortingControls.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;

                currentLocationSort = button.dataset.sortBy;
                
                locationSortingControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                renderLocationProgressBars();
            });
			
			documentsTableBody.addEventListener('click', e => {
                const logButton = e.target.closest('.log-status-btn');
                if (logButton) {
                    const docId = logButton.dataset.docId;
                    const doc = documents.find(d => d.id === docId);
                    if (doc) {
                        openStatusLogModal(doc);
                    }
                }
            });

            closeStatusLogModalBtn.addEventListener('click', closeStatusLogModal);
            statusLogModal.addEventListener('click', e => e.target === statusLogModal && closeStatusLogModal());

            newCommentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const docId = e.target.dataset.docId;
                const text = newCommentText.value.trim();
                const commentor = newCommentor.value.trim();

                if (!text || !commentor) {
                    displayGlobalMessage('Both comment and name are required.', 'error');
                    return;
                }

                const docToUpdate = documents.find(d => d.id === docId);
                if (docToUpdate) {
                    // Create a true copy to add the new comment
                    const updatedDocData = JSON.parse(JSON.stringify(docToUpdate));
                    const newComment = {
                        timestamp: new Date().toISOString(),
                        text: text,
                        commentor: commentor
                    };
                    if (!updatedDocData.comments) {
                        updatedDocData.comments = [];
                    }
                    updatedDocData.comments.push(newComment);

                    // Create FormData and post the entire updated document to the server
                    const formData = new FormData();
                    formData.append('document', JSON.stringify(updatedDocData));

                    // Post the data and wait for the server to process
                    await postDocumentToServer(formData);

                    // After the server round-trip, the data is fresh.
                    // Find the latest version of the doc to re-open/update the modal.
                    const finalDoc = documents.find(d => d.id === docId);
                    if (finalDoc) {
                        openStatusLogModal(finalDoc); // Re-render the modal with the new comment
                    }
                    newCommentForm.reset();
                    newCommentText.focus();
                }
            });
			
			notificationsList.addEventListener('click', (e) => {
                const listItem = e.target.closest('li.clickable');
                if (listItem && listItem.dataset.docId) {
                    const docId = listItem.dataset.docId;
                    const doc = documents.find(d => d.id === docId);
                    if (doc) {
                        openNotificationActionModal(doc);
                    } else {
                        displayGlobalMessage('Error: Could not find the document for that notification.');
                    }
                }
            });

            closeNotificationActionModalBtn.addEventListener('click', closeNotificationActionModal);
            notificationActionModal.addEventListener('click', e => e.target === notificationActionModal && closeNotificationActionModal());

            actionViewStatusBtn.addEventListener('click', (e) => {
                const docId = e.target.dataset.docId;
                const doc = documents.find(d => d.id === docId);
                if (doc) {
                    openStatusLogModal(doc);
                    statusLogModal.classList.add('modal-on-top');
                } else {
                    displayGlobalMessage('Error: Could not find the document to view its status.');
                }
            });

            actionRenewBtn.addEventListener('click', (e) => {
                const docId = e.target.dataset.docId;
                const docToRenew = documents.find(d => d.id === docId);
                if (docToRenew) {
                    sessionStorage.setItem('renewingDocId', docId);
                    // We can close the small notification modal now
                    closeNotificationActionModal(); 
                    openDocumentModal(docToRenew, true);
                    documentModal.classList.add('modal-on-top');
                } else {
                    displayGlobalMessage('Error: Could not find the document to renew.');
                }
            });

            initializeApp();
			
			generateFullReportBtn.addEventListener('click', () => {
                const allLocationIds = locations.map(loc => loc.id);
                generateComplianceReport(allLocationIds);
            });

            generateReportBtn.addEventListener('click', (e) => {
                const locationId = e.target.closest('.modal-content').querySelector('h2').textContent.split(': ')[1];
                const loc = locations.find(l => l.name === locationId);
                if (loc) {
                    generateComplianceReport([loc.id]);
                }
            });
			
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    if (documentModal.classList.contains('active')) closeDocumentModal();
                    if (renewModal.classList.contains('active')) closeRenewModal();
                    if (document.getElementById('deleteModal').classList.contains('active')) closeDeleteModal();
                    if (document.getElementById('deleteAttachmentModal').classList.contains('active')) closeDeleteAttachmentModal();
                    if (previewModal.classList.contains('active')) closePreviewModal();
                    if (complianceDetailsModal.classList.contains('active')) closeComplianceDetailsModal();
                }
            });

            if (addOneTimeCheckbox) {
                addOneTimeCheckbox.addEventListener('change', () => {
                    if (addOneTimeCheckbox.checked) {
                        addExpInput.disabled = true;
                        addExpInput.removeAttribute('required');
                        addExpInput.style.backgroundColor = '#eee';
                        addExpInput.style.color = '#666';
                        addExpInput.value = '';
                    } else {
                        addExpInput.disabled = false;
                        addExpInput.setAttribute('required', 'true');
                        addExpInput.style.backgroundColor = '';
                        addExpInput.style.color = '';
                    }
                });
            }
        });