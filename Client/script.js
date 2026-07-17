// Allow only logged-in users to access the dashboard
if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
}

// ==================== USER PROFILE ====================
function loadUserProfile() {
    var userStr = localStorage.getItem('taskflowUser');
    if (!userStr) { 
        window.location.href = 'login.html'; 
        return; 
    }

    var user = JSON.parse(userStr);
    
    // Get initials (max 2 characters)
    var words = user.username.split(' ');
    var initials;
    if (words.length >= 2) {
        initials = words[0][0] + words[1][0];
    } else {
        initials = words[0].substring(0, 2);
    }
    initials = initials.toUpperCase();
    
    // Truncate name if too long
    var displayName = user.username;
    if (displayName.length > 15) {
        displayName = displayName.substring(0, 12) + '...';
    }
    
    // Set elements
    var setText = function(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    
    setText('userAvatar', initials);
    setText('menuAvatar', initials);
    setText('displayName', displayName);
    setText('menuName', displayName);
    setText('displayEmail', user.email);
    setText('menuEmail', user.email);
    
    var dw = document.getElementById('dayWish');
    if (dw) {
        var hour = new Date().getHours();
        var wish = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        // Also truncate in wish
        var name = user.username;
        if (name.length > 10) name = name.substring(0, 8) + '...';
        dw.textContent = wish + ', ' + name + ' 👋';
    }
}

function toggleUserMenu() {
    var d = document.getElementById('userDropdown');
    if (d) d.classList.toggle('show');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-profile')) {
        var d = document.getElementById('userDropdown');
        if (d) d.classList.remove('show');
    }
});

// ==================== VARIABLES ====================
var tasks = [];
var selectedTasks = [];
var currentFilter = 'all';
var currentStatus = 'all';
var isDark = localStorage.getItem('theme') === 'dark';
var deletedTask = null;
var editTaskId = null;
var deleteTimeout = null;
var focusMode = false;

// Timer Variables
var timerInterval = null;
var timerTime = 25 * 60;
var timerRunning = false;
var currentTimerMode = 25;
var timerStartTime = null;
var timerElapsedSeconds = 0;

// Time Tracking
var taskTimes = JSON.parse(localStorage.getItem('taskTimes')) || {};

// Load theme
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

// Date & Quote
var cd = document.getElementById('currentDate');
if (cd) cd.textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

var quotes = [
    'Stay focused and crush your goals!', 
    'One task at a time!', 
    'You got this! 💪', 
    'Progress, not perfection!', 
    'Start small, dream big!'
];
var qt = document.getElementById('quoteText');
if (qt) qt.textContent = quotes[Math.floor(Math.random() * quotes.length)];

async function loadTasks() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const data = await getTasks(token);
        tasks = data.map(task => ({
            id: task._id,
            text: task.title,
            list: task.category,
            priority: task.priority,
            dueDate: task.dueDate
                ? task.dueDate.split("T")[0]
                : "",
            completed: task.completed
        }));
        renderTasks();
        updateWidgets();
    } catch (err) {
        console.error(err);
        showToast("Unable to load tasks", "error");
    }
}

// ==================== SOUND EFFECTS ====================
function playSound(type) {
    try {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        if (type === 'complete') { 
            oscillator.frequency.value = 800; 
            gainNode.gain.value = 0.1; oscillator.start(); 
            setTimeout(function() { 
                oscillator.stop(); 
            }, 200); 
        }
        else if (type === 'delete') { 
            oscillator.frequency.value = 300; 
            gainNode.gain.value = 0.1; 
            oscillator.start(); 
            setTimeout(function() { 
                oscillator.stop(); 
            }, 150); 
        }
    } catch(e) {}
}

// ==================== MULTIPLE SELECT ====================
function toggleTaskSelect(id) {
    var index = selectedTasks.indexOf(id);
    if (index > -1) selectedTasks.splice(index, 1);
    else selectedTasks.push(id);
    renderTasks();
}

function selectAll() { 
    selectedTasks = tasks.map(function(t) { 
        return t.id; 
    }); 
    renderTasks(); 
}
function clearSelection() { 
    selectedTasks = []; 
    renderTasks(); 
}

function deleteSelected() {
    if (selectedTasks.length === 0) { 
        showToast('No tasks selected!', 'error'); 
        return; 
    }
    if (confirm('Delete ' + selectedTasks.length + ' tasks?')) {
        tasks = tasks.filter(function(t) { 
            return selectedTasks.indexOf(t.id) === -1; 
        });
        selectedTasks = [];
        saveTasks();
        renderTasks();
        updateWidgets();
        playSound('delete');
        showToast('Tasks deleted!', 'success');
    }
}

// ==================== ADD TASK ====================
async function addTask() {

    const input = document.getElementById("taskInput");
    const text = input.value.trim();
    const priority = document.getElementById("priority").value;
    const list = document.getElementById("list").value;
    const dueDate = document.getElementById("dueDate").value;
    if (text === "") {
        showToast("Please enter a task!", "error");
        input.focus();
        return;
    }
    const token = localStorage.getItem("token");
    try {
        const task = await createTask({
            title: text,
            priority: priority,
            category: list,
            dueDate: dueDate
        }, token);

        // Add MongoDB task to local array
        tasks.unshift({
            id: task._id,
            text: task.title,
            list: task.category,
            priority: task.priority,
            dueDate: task.dueDate
                ? task.dueDate.split("T")[0]
                : "",
            completed: task.completed
        });

        renderTasks();
        updateWidgets();

        input.value = "";
        document.getElementById("dueDate").value = "";

        showToast("Task added!", "success");

    } catch (err) {

        console.error(err);
        showToast("Unable to add task", "error");

    }
}

// ==================== DELETE ====================
async function deleteTask(id) {
    const token = localStorage.getItem("token");
    try {
        await deleteTaskAPI(id, token);
        var index = tasks.findIndex(function(t) {
            return t._id === id;
        });
        if (index > -1) {
            deletedTask = {
                task: tasks[index],
                index: index
            };
            tasks.splice(index, 1);
            renderTasks();
            updateWidgets();
            playSound("delete");
            document
                .getElementById("undoSnackbar")
                .classList.add("show");
            if (deleteTimeout)
                clearTimeout(deleteTimeout);
            deleteTimeout = setTimeout(function () {
                document
                    .getElementById("undoSnackbar")
                    .classList.remove("show");
                deletedTask = null;
            }, 5000);
        }
    } catch (err) {
        console.error(err);
        showToast("Unable to delete task", "error");
    }
}

// ==================== TOGGLE COMPLETE ====================
function toggleComplete(id) {
    tasks = tasks.map(function(task) {
        if (task.id === id) {
            var updated = { 
                id: task.id, 
                text: task.text, 
                priority: task.priority, 
                list: task.list, 
                dueDate: task.dueDate, 
                completed: !task.completed 
            };
            if (updated.completed) {
                playSound('complete');
                showToast('Task completed! 🎉', 'success');
                updateStreak();
                setTimeout(function() { 
                    checkAchievements(); 
                }, 500);
                if (task.recurring) {
                    setTimeout(function() {
                        var newTask = { 
                            id: Date.now(), 
                            text: task.text, 
                            priority: task.priority, 
                            list: task.list, 
                            dueDate: getNextDate(task.recurring), 
                            completed: false 
                        };
                        tasks.unshift(newTask);
                        saveTasks();
                        renderTasks();
                    }, 1000);
                }
            }
            return updated;
        }
        return task;
    });
    saveTasks();
    renderTasks();
    updateWidgets();
}

function getNextDate(frequency) {
    var date = new Date();
    if (frequency === 'daily') date.setDate(date.getDate() + 1);
    else if (frequency === 'weekly') date.setDate(date.getDate() + 7);
    else if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
}

// ==================== EDIT ====================
function editTask(id) {
    var task = tasks.find(function(t) { return t.id === id; });
    if (task) {
        editTaskId = id;
        document.getElementById('editTaskInput').value = task.text;
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editList').value = task.list;
        document.getElementById('editDueDate').value = task.dueDate || '';
        document.getElementById('editModal').classList.add('show');
    }
}

function closeEditModal() { 
    document.getElementById('editModal').classList.remove('show'); editTaskId = null; 
}

async function saveEdit() {
    if (!editTaskId) return;
    const token = localStorage.getItem("token");
    try {
        const updatedTask = await updateTask(
            editTaskId,
            {
                title: document.getElementById("editTaskInput").value,
                priority: document.getElementById("editPriority").value,
                category: document.getElementById("editList").value,
                dueDate: document.getElementById("editDueDate").value
            },
            token
        );
        tasks = tasks.map(function (task) {
            if (task._id === editTaskId) {
                return {
                    id: updatedTask._id,
                    text: updatedTask.title,
                    list: updatedTask.category,
                    priority: updatedTask.priority,
                    dueDate: updatedTask.dueDate
                        ? updatedTask.dueDate.split("T")[0]
                        : "",
                    completed: updatedTask.completed
                };
            }
            return task;
        });
        renderTasks();
        updateWidgets();
        closeEditModal();
        showToast("Task updated!", "success");
    } catch (err) {
        console.error(err);
        showToast("Unable to update task", "error");
    }
}

// ==================== DRAG & DROP ====================
var draggedItem = null;
function handleDragStart(e, id) { 
    draggedItem = id; 
    e.dataTransfer.effectAllowed = 'move'; 
    e.target.classList.add('dragging'); 
}
function handleDragEnd(e) { 
    e.target.classList.remove('dragging'); 
    draggedItem = null; 
}
function handleDragOver(e) { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
}
function handleDrop(e, targetId) {
    e.preventDefault();
    if (draggedItem && targetId) {
        var fromIndex = tasks.findIndex(function(t) { 
            return t.id === draggedItem; 
        });
        var toIndex = tasks.findIndex(function(t) { 
            return t.id === targetId; 
        });
        if (fromIndex > -1 && toIndex > -1) {
            var task = tasks.splice(fromIndex, 1)[0];
            tasks.splice(toIndex, 0, task);
            saveTasks();
            renderTasks();
        }
    }
}

// ==================== FILTERS ====================
function filterTasks(list) {
    currentFilter = list;
    document.querySelectorAll('.list-btn').forEach(function(btn) { 
        btn.classList.remove('active'); 
    });
    document.getElementById('filter' + list.charAt(0).toUpperCase() + list.slice(1)).classList.add('active');
    renderTasks();
}

function statusFilter(status) {
    currentStatus = status;
    document.querySelectorAll('.status-tabs button').forEach(function(btn) { 
        btn.classList.remove('active'); 
    });
    document.getElementById('status' + status.charAt(0).toUpperCase() + status.slice(1)).classList.add('active');
    renderTasks();
}

function searchTasks() {
    var input = document.getElementById('searchInput');
    if (input.value) document.querySelector('.clear-btn').classList.add('show');
    else document.querySelector('.clear-btn').classList.remove('show');
    renderTasks();
}

// ==================== RENDER TASKS ====================
function renderTasks() {
    var taskList = document.getElementById('taskList');
    var emptyState = document.getElementById('emptyState');
    var searchText = document.getElementById('searchInput').value.toLowerCase();
    var today = new Date().toISOString().split('T')[0];
    
    taskList.innerHTML = '';
    
    var filtered = tasks.filter(function(task) {
        if (currentFilter !== 'all' && task.list !== currentFilter) return false;
        if (currentStatus === 'active' && task.completed) return false;
        if (currentStatus === 'completed' && !task.completed) return false;
        if (searchText && !task.text.toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    emptyState.classList.toggle('show', filtered.length === 0);
    
    var listEmoji = { 
        work: '💼', 
        personal: '👤', 
        shopping: '🛒', 
        important: '⭐' 
    };
    var listColor = { 
        work: '#3b82f6', 
        personal: '#10b981', 
        shopping: '#f59e0b', 
        important: '#ef4444' 
    };
    
    filtered.forEach(function(task) {
        var li = document.createElement('li');
        li.setAttribute('draggable', 'true');
        li.setAttribute('data-id', task.id);
        
        var dueClass = '';
        if (task.dueDate) {
            if (task.dueDate < today && !task.completed) dueClass = 'overdue';
            else if (task.dueDate === today) dueClass = 'due-today';
        }
        
        var isSelected = selectedTasks.indexOf(task.id) > -1;
        li.className = task.priority + (task.completed ? ' completed' : '') + (isSelected ? ' selected' : '');
        li.style.borderLeft = '4px solid ' + listColor[task.list];
        
        li.innerHTML = 
            '<div class="task-checkbox" onclick="toggleTaskSelect(' + task.id + ')"><i class="fas ' + (isSelected ? 'fa-check-square' : 'fa-square') + '"></i></div>' +
            '<div class="task-content" ondragstart="handleDragStart(event, ' + task.id + ')" ondragend="handleDragEnd(event)" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ' + task.id + ')">' +
                '<div class="task-text">' + task.text + '</div>' +
                '<div class="task-meta"><span style="color:' + listColor[task.list] + '">' + listEmoji[task.list] + ' ' + task.list + '</span><span class="priority-' + task.priority + '">' + task.priority + '</span>' +
                (task.dueDate ? '<span class="' + dueClass + '">📅 ' + task.dueDate + '</span>' : '') +
                (task.recurring ? '<span class="recurring">🔄 ' + task.recurring + '</span>' : '') +
                '</div>' +
            '</div>' +
            '<div class="task-actions">' +
                '<button class="time" onclick="trackTimeForTask(' + task.id + ')" title="Track Time"><i class="fas fa-clock"></i></button>' +
                '<button class="edit" onclick="editTask(' + task.id + ')"><i class="fas fa-edit"></i></button>' +
                '<button class="check" onclick="toggleComplete(' + task.id + ')"><i class="fas fa-check"></i></button>' +
                '<button class="delete" onclick="deleteTask(' + task.id + ')"><i class="fas fa-trash"></i></button>' +
            '</div>';
        
        taskList.appendChild(li);
    });
    
    updateStats();
    updateProgress();
    updateBadges();
}

function updateStats() {
    var total = tasks.length;
    var done = tasks.filter(function(t) { 
        return t.completed; 
    }).length;
    document.getElementById('total').textContent = total;
    document.getElementById('done').textContent = done;
    document.getElementById('remaining').textContent = total - done;
}

function updateProgress() {
    var total = tasks.length;
    var done = tasks.filter(function(t) { 
        return t.completed; 
    }).length;
    var percent = total === 0 ? 0 : Math.round((done / total) * 100);
    var circle = document.getElementById('progressCircle');
    if (circle) circle.style.strokeDashoffset = 314 - (314 * percent / 100);
    var p = document.getElementById('progressPercent');
    if (p) p.textContent = percent + '%';
}

function updateBadges() {
    document.getElementById('badgeAll').textContent = tasks.length;
    document.getElementById('badgeWork').textContent = tasks.filter(function(t) { 
        return t.list === 'work'; 
    }).length;
    document.getElementById('badgePersonal').textContent = tasks.filter(function(t) { 
        return t.list === 'personal'; 
    }).length;
    document.getElementById('badgeShopping').textContent = tasks.filter(function(t) { 
        return t.list === 'shopping'; 
    }).length;
    document.getElementById('badgeImportant').textContent = tasks.filter(function(t) { 
        return t.list === 'important'; 
    }).length;
}

// ==================== THEME ====================
function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('theme', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

// ==================== TOAST ====================
function showToast(message, type) {
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    if (toast && toastMessage) {
        toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }
}

// ==================== TIMER ====================
function updateTimerDisplay() {
    var mins = Math.floor(timerTime / 60);
    var secs = timerTime % 60;
    var m = document.getElementById('timerMinutes');
    var s = document.getElementById('timerSeconds');
    if (m) m.textContent = mins.toString().padStart(2, '0');
    if (s) s.textContent = secs.toString().padStart(2, '0');
}

function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerStartTime = Date.now();
    document.getElementById('timerStart').style.display = 'none';
    document.getElementById('timerPause').style.display = 'block';
    
    timerInterval = setInterval(function() {
        timerElapsedSeconds++;
        if (timerTime > 0) {
            timerTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerRunning = false;
            var minutes = Math.round(timerElapsedSeconds / 60);
            if (minutes > 0) logTimerTime(minutes);
            timerElapsedSeconds = 0;
            document.getElementById('timerStart').style.display = 'block';
            document.getElementById('timerPause').style.display = 'none';
            showToast('Timer complete! 🎉', 'success');
            playSound('complete');
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    if (timerRunning && timerStartTime) {
        var elapsed = Math.round((Date.now() - timerStartTime) / 1000);
        timerElapsedSeconds += elapsed;
    }
    timerRunning = false;
    timerStartTime = null;
    document.getElementById('timerStart').style.display = 'block';
    document.getElementById('timerPause').style.display = 'none';
}

function resetTimer() { 
    pauseTimer(); 
    timerTime = currentTimerMode * 60; 
    timerElapsedSeconds = 0; 
    updateTimerDisplay(); 
}
function setTimer(minutes) { 
    pauseTimer(); 
    currentTimerMode = minutes; 
    timerTime = minutes * 60; 
    timerElapsedSeconds = 0; 
    updateTimerDisplay(); 
}

// ==================== TIME TRACKING ====================
function logTimerTime(minutes) {
    if (minutes < 1) return;
    var currentTask = null;
    for (var i = 0; i < tasks.length; i++) {
        if (!tasks[i].completed) { 
            currentTask = tasks[i]; 
            break; 
        }
    }
    if (currentTask) {
        var tid = String(currentTask.id);
        if (!taskTimes[tid]) taskTimes[tid] = { 
            name: currentTask.text, 
            total: 0 
        };
        taskTimes[tid].total += minutes;
        taskTimes[tid].name = currentTask.text;
        localStorage.setItem('taskTimes', JSON.stringify(taskTimes));
        showToast('🕐 Logged ' + minutes + ' min to: ' + currentTask.text.substring(0, 15), 'success');
    }
}

function trackTimeForTask(taskId) {
    var task = tasks.find(function(t) { 
        return t.id === taskId; 
    });
    if (!task) return;
    var minutes = prompt('How many minutes did you work on this task?', '15');
    minutes = parseInt(minutes);
    if (minutes && !isNaN(minutes) && minutes > 0) {
        var tid = String(taskId);
        if (!taskTimes[tid]) taskTimes[tid] = { 
            name: task.text, 
            total: 0 
        };
        taskTimes[tid].total += minutes;
        taskTimes[tid].name = task.text;
        localStorage.setItem('taskTimes', JSON.stringify(taskTimes));
        showToast('🕐 Logged ' + minutes + ' minutes!', 'success');
    }
}

function showTimeTracking() {
    var modal = document.getElementById('timeModal');
    if (!modal) { 
        modal = createModal('timeModal', '⏱️ Time Tracking'); 
    }
    var html = '<div class="time-tracking">';
    var hasTime = false;
    var totalMinutes = 0;
    for (var id in taskTimes) {
        if (taskTimes[id].total > 0) {
            hasTime = true;
            totalMinutes += taskTimes[id].total;
            html += '<div class="time-item"><span>' + (taskTimes[id].name || 'Task').substring(0, 25) + '</span><span>' + taskTimes[id].total + ' min</span></div>';
        }
    }
    if (hasTime) { 
        html = '<div class="time-summary"><h3>Total: ' + totalMinutes + ' minutes</h3></div>' + html; 
    }
    else { 
        html += '<p style="text-align:center;color:var(--text-light);padding:30px;">No time tracked yet!</p>'; 
    }
    html += '</div>';
    modal.querySelector('.modal-body').innerHTML = html;
    modal.classList.add('show');
}

// ==================== WIDGETS ====================
function updateWidgets() { renderCalendar(); renderDueToday(); renderRecent(); }

function renderCalendar() {
    var calendar = document.getElementById('calendar');
    var now = new Date();
    var monthNames = [
        'January', 
        'February', 
        'March', 
        'April', 
        'May', 
        'June', 
        'July', 
        'August', 
        'September', 
        'October', 
        'November', 
        'December'
    ];
    var html = '<div class="month">' + monthNames[now.getMonth()] + ' ' + now.getFullYear() + '</div><div class="days">';
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var today = now.getDate();
    var taskDates = tasks.filter(function(t) { 
        return t.dueDate; 
    }).map(function(t) { 
        return t.dueDate.split('-')[2]; 
    });
    for (var i = 1; i <= daysInMonth; i++) {
        var classes = 'day';
        if (i === today) classes += ' today';
        if (taskDates.indexOf(i.toString()) > -1) classes += ' has-task';
        html += '<div class="' + classes + '">' + i + '</div>';
    }
    calendar.innerHTML = html + '</div>';
}

function renderDueToday() {
    var list = document.getElementById('dueTodayList');
    var today = new Date().toISOString().split('T')[0];
    var dueToday = tasks.filter(function(t) { 
        return t.dueDate === today && !t.completed; 
    });
    list.innerHTML = dueToday.length === 0 ? '<li><span class="dot"></span>No tasks due today</li>' : dueToday.map(function(t) {
        return '<li><span class="dot"></span>' + t.text + '</li>'; 
    }).join('');
}

function renderRecent() {
    var list = document.getElementById('recentList');
    var recent = tasks.slice(0, 5);
    list.innerHTML = recent.length === 0 ? '<li><span class="dot"></span>No recent activity</li>' : recent.map(function(t) { 
        return '<li><span class="dot"></span>' + (t.text.length > 16 ? t.text.substring(0, 16) + '...' : t.text) + '</li>'; 
    }).join('');
}

function saveNotes() { 
    localStorage.setItem('quickNotes', document.getElementById('quickNotes').value); 
}
function loadNotes() { 
    var notes = document.getElementById('quickNotes'); 
    if (notes) notes.value = localStorage.getItem('quickNotes') || ''; 
}

// ==================== CLEAR COMPLETED ====================
function clearCompleted() {
    var completed = tasks.filter(function(t) { return t.completed; });
    if (completed.length === 0) { 
        showToast('No completed tasks!', 'error'); 
        return; 
    }
    if (confirm('Delete all ' + completed.length + ' completed tasks?')) {
        tasks = tasks.filter(function(t) { return !t.completed; });
        saveTasks();
        renderTasks();
        updateWidgets();
        showToast('Completed tasks cleared!', 'success');
    }
}

function exportCSV() {
    var headers = ['Task', 'Priority', 'List', 'Due Date', 'Status'];
    var rows = tasks.map(function(t) { 
        return [t.text, t.priority, t.list, t.dueDate || '', t.completed ? 'Done' : 'Active']; 
    });
    var csv = [headers.join(',')].concat(rows.map(function(r) { 
        return r.join(','); 
    })).join('\n');
    var blob = new Blob([csv], { 
        type: 'text/csv' 
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tasks.csv';
    a.click();
    showToast('Tasks exported!', 'success');
}

// ==================== MODALS ====================
function createModal(id, title) {
    var modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.innerHTML = '<div class="modal-backdrop" onclick="closeModal(\'' + id + '\')"></div><div class="modal-content"><div class="modal-header"><h3>' + title + '</h3><button onclick="closeModal(\'' + id + '\')"><i class="fas fa-times"></i></button></div><div class="modal-body"></div></div>';
    document.body.appendChild(modal);
    return modal;
}

function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop')) { e.target.parentElement.classList.remove('show'); }
});

// ==================== ANALYTICS ====================
function showAnalytics() {
    var modal = document.getElementById('analyticsModal') || createModal('analyticsModal', '📊 Analytics');
    var total = tasks.length;
    var completed = tasks.filter(function(t) { 
        return t.completed; 
    }).length;
    var work = tasks.filter(function(t) { 
        return t.list === 'work' && t.completed; 
    }).length;
    var personal = tasks.filter(function(t) { 
        return t.list === 'personal' && t.completed; 
    }).length;
    var shopping = tasks.filter(function(t) { 
        return t.list === 'shopping' && t.completed; 
    }).length;
    var important = tasks.filter(function(t) { 
        return t.list === 'important' && t.completed; 
    }).length;
    var html = 
        '<div class="analytics-grid">' +
            '<div class="stat-card"><h4>Total</h4><div class="big-number">' + total + '</div></div>' +
            '<div class="stat-card"><h4>Done</h4><div class="big-number success">' + completed + '</div></div>' +
            '<div class="stat-card"><h4>%</h4><div class="big-number primary">' + (total > 0 ? Math.round((completed/total)*100) : 0) + '%</div></div>' +
            '<div class="stat-card"><h4>🔥</h4><div class="big-number warning">' + getStreak() + '</div></div>' +
        '</div>';
    modal.querySelector('.modal-body').innerHTML = html;
    modal.classList.add('show');
}

// ==================== ACHIEVEMENTS ====================
var achievements = [
    { id: 'first', 
        name: 'First Step', 
        desc: 'Complete 1 task', 
        icon: '🎯', 
        condition: function() { 
            return tasks.filter(function(t) { 
                return t.completed; 
            }).length >= 1; 
        }
    },
    { id: 'ten', 
        name: 'Getting Started', 
        desc: 'Complete 10 tasks', 
        icon: '🌟', 
        condition: function() { 
            return tasks.filter(function(t) { 
                return t.completed; 
            }).length >= 10; 
        }
    },
    { id: 'fifty', 
        name: 'Half Century', 
        desc: 'Complete 50 tasks', 
        icon: '🏆', 
        condition: function() { 
            return tasks.filter(function(t) { 
                return t.completed; 
            }).length >= 50; 
        }
    },
    { id: 'streak3', 
        name: 'On Fire', 
        desc: '3 day streak', 
        icon: '🔥', 
        condition: function() { 
            return getStreak() >= 3; 
        }
    },
    { id: 'perfect', 
        name: 'Perfectionist', 
        desc: 'Complete all', 
        icon: '💎', 
        condition: function() { 
            return tasks.length > 0 && tasks.filter(function(t) { 
                return !t.completed; 
            }).length === 0; 
        }
    }
];
var earnedBadges = JSON.parse(localStorage.getItem('badges')) || [];

function checkAchievements() {
    var newBadges = [];
    achievements.forEach(function(a) {
        if (earnedBadges.indexOf(a.id) === -1 && a.condition()) {
            earnedBadges.push(a.id);
            newBadges.push(a);
        }
    });
    if (newBadges.length > 0) {
        localStorage.setItem('badges', JSON.stringify(earnedBadges));
        // Celebration for FIRST new badge
        celebrateBadge(newBadges[0].name);
    }
}

function showBadges() {
    var modal = document.getElementById('badgesModal') || createModal('badgesModal', '🎖️ Achievements');
    var html = '<div class="badges-grid">';
    achievements.forEach(function(a) {
        var earned = earnedBadges.indexOf(a.id) > -1;
        html += '<div class="badge-card ' + (earned ? 'earned' : 'locked') + '"><div class="badge-icon">' + a.icon + '</div><div class="badge-name">' + a.name + '</div><div class="badge-desc">' + a.desc + '</div></div>';
    });
    html += '</div>';
    modal.querySelector('.modal-body').innerHTML = html;
    modal.classList.add('show');
}

// Reset all badges
function resetBadges() {
    localStorage.removeItem('badges');
    localStorage.removeItem('streak');
    localStorage.removeItem('lastActive');
    showToast('🎖️ Badges reset! Complete tasks to earn again.', 'success');
}

// Also reset all tasks
function resetAllTasks() {
    if (confirm('Delete ALL tasks? This cannot be undone!')) {
        localStorage.removeItem('tasks');
        localStorage.removeItem('badges');
        localStorage.removeItem('streak');
        localStorage.removeItem('lastActive');
        localStorage.removeItem('taskTimes');
        tasks = [];
        renderTasks();
        updateWidgets();
        showToast('All data cleared!', 'success');
    }
}

// ==================== STREAK ====================
function getStreak() {
    var streak = parseInt(localStorage.getItem('streak')) || 0;
    var lastDate = localStorage.getItem('lastActive');
    var today = new Date().toISOString().split('T')[0];
    if (lastDate !== today) {
        var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastDate !== yesterday.toISOString().split('T')[0]) streak = 0;
    }
    return streak;
}

function updateStreak() {
    var completedToday = tasks.filter(function(t) { 
        return t.completed; 
    }).length;
    if (completedToday > 0) {
        var streak = getStreak();
        var today = new Date().toISOString().split('T')[0];
        if (localStorage.getItem('lastActive') !== today) {
            streak++;
            localStorage.setItem('streak', streak);
            localStorage.setItem('lastActive', today);
        }
    }
}

// ==================== CELEBRATION ANIMATION ====================
function celebrateBadge(badgeName) {
    // Create confetti
    var colors = [
        '#6366f1', 
        '#8b5cf6', 
        '#f472b6', 
        '#10b981', 
        '#f59e0b', 
        '#ef4444'
    ];
    var container = document.body;
    
    for (var i = 0; i < 100; i++) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.position = 'fixed';
        confetti.style.top = '-20px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        container.appendChild(confetti);
        
        // Animate
        confetti.animate([
            { 
                top: '-20px', 
                transform: 'rotate(0deg)', 
                opacity: 1 
            },
            { 
                top: '100vh', 
                transform: 'rotate(720deg)', 
                opacity: 0 
            }
        ], {
            duration: 3000 + Math.random() * 2000,
            easing: 'ease-in'
        });
        
        // Remove after animation
        setTimeout(function() { 
            confetti.remove(); 
        }, 5000);
    }
    
    // Show badge popup
    var popup = document.createElement('div');
    popup.className = 'badge-popup';
    popup.innerHTML = '<div class="badge-popup-content">🎖️<h2>Badge Earned!</h2><p>' + badgeName + '</p></div>';
    popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:10000;pointer-events:none;';
    document.body.appendChild(popup);
    
    setTimeout(function() {
        popup.animate([{ 
            transform: 'scale(0)' 
        }, { 
            transform: 'scale(1)' 
        }, { 
            transform: 'scale(1)' 
        }, { 
            transform: 'scale(0)' 
        }], { 
            duration: 3000, easing: 'ease' 
        });
        setTimeout(function() { 
            popup.remove(); 
        }, 3000);
    }, 100);
}

// ==================== DAILY REPORT ====================
function showDailyReport() {
    var modal = document.getElementById('reportModal') || createModal('reportModal', '📊 Daily Report');
    var completed = tasks.filter(function(t) { return t.completed; }).length;
    var remaining = tasks.filter(function(t) { return !t.completed; }).length;
    var html = 
        '<div class="daily-report">' +
            '<h3>📅 ' + new Date().toLocaleDateString() + '</h3>' +
            '<div class="report-stats">' +
                '<div class="report-item"><div class="report-value">' + completed + '</div><div class="report-label">Completed</div></div>' +
                '<div class="report-item"><div class="report-value">' + remaining + '</div><div class="report-label">Remaining</div></div>' +
                '<div class="report-item"><div class="report-value">' + tasks.length + '</div><div class="report-label">Total</div></div>' +
            '</div>' +
        '</div>';
    modal.querySelector('.modal-body').innerHTML = html;
    modal.classList.add('show');
}

// ==================== FOCUS MODE ====================
function toggleFocusMode() {
    focusMode = !focusMode;
    var sidebar = document.querySelector('.sidebar');
    var rightSidebar = document.querySelector('.right-sidebar');
    if (focusMode) {
        if (sidebar) sidebar.style.display = 'none';
        if (rightSidebar) rightSidebar.style.display = 'none';
        if (document.querySelector('.main')) document.querySelector('.main').style.margin = '20px';
    } else {
        if (sidebar) sidebar.style.display = 'block';
        if (rightSidebar) rightSidebar.style.display = 'block';
        if (document.querySelector('.main')) { document.querySelector('.main').style.marginLeft = '270px'; document.querySelector('.main').style.marginRight = '270px'; }
    }
    showToast(focusMode ? 'Focus Mode ON - Press Esc' : 'Focus Mode OFF', 'success');
}

// ==================== FLOATING BUTTON ====================
function createFloatingButton() {
    if (document.getElementById('floatingAdd')) return;
    var btn = document.createElement('button');
    btn.id = 'floatingAdd';
    btn.className = 'floating-add-btn';
    btn.innerHTML = '<i class="fas fa-plus"></i>';
    btn.onclick = function() { 
        document.getElementById('taskInput').focus(); 
    };
    btn.title = 'Quick Add (Ctrl+N)';
    document.body.appendChild(btn);
}

var style = document.createElement('style');
style.innerHTML = '.floating-add-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: white; font-size: 24px; cursor: pointer; box-shadow: 0 6px 20px rgba(99,102,241,0.4); z-index: 999; transition: 0.3s; } .floating-add-btn:hover { transform: scale(1.1); }';
document.head.appendChild(style);

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { 
        e.preventDefault(); focusAddInput(); 
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { 
        e.preventDefault(); document.getElementById('searchInput').focus(); 
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') { 
        e.preventDefault(); selectAll(); 
    }
    if (e.key === 'Escape') { 
        closeEditModal(); clearSelection(); if (focusMode) toggleFocusMode(); 
    }
    if (e.key === 'Delete' && selectedTasks.length > 0) { 
        deleteSelected(); 
    }
});

console.log('%c🎯 TaskFlow Pro', 'color: #6366f1; font-size: 20px; font-weight: bold;');
console.log('Ctrl+N: New | Ctrl+F: Search | Ctrl+A: Select All | Del: Delete | Esc: Close');

// ==================== INITIALIZE ====================
if(document.getElementById("taskList"))
{
    loadNotes();
    loadTasks();
    loadUserProfile();
    createFloatingButton();
    updateStreak();
    checkAchievements();

    console.log('🎯 All Features Loaded!');
}