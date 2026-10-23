
const taskForm = document.getElementById("taskForm");
const classForm = document.getElementById("classForm");

const taskList = document.getElementById("taskList");
const timetable = document.getElementById("timetable");
const weeklyTimetable = document.getElementById("weeklyTimetable");
const weekDays = document.getElementById("weekDays");

const taskFilter = document.getElementById("taskFilter");
const taskSearch = document.getElementById("taskSearch");

const taskTitle = document.getElementById("taskTitle");
const taskSubject = document.getElementById("taskSubject");
const taskDeadline = document.getElementById("taskDeadline");

const taskFormHeading = document.getElementById("taskFormHeading");
const saveTaskButton = document.getElementById("saveTaskButton");
const cancelEditButton = document.getElementById("cancelEditButton");

const dayNames = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
];

// Read saved information safely.
function loadData(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

let tasks = loadData("studyMateTasks");
let classes = loadData("studyMateClasses");
let editingTaskId = null;

// Use a date string in local time, not UTC.
function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function saveData() {
    try {
        localStorage.setItem("studyMateTasks", JSON.stringify(tasks));
        localStorage.setItem("studyMateClasses", JSON.stringify(classes));
        return true;
    } catch (error) {
        alert("Could not save data. Check your browser storage.");
        console.error(error);
        return false;
    }
}

// Create elements using textContent for safe text display.
function createElement(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;

    if (className) {
        element.className = className;
    }

    return element;
}

function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// Display today's date.
document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

// Dashboard counts.
function renderStats() {
    document.getElementById("totalTasks").textContent = tasks.length;

    document.getElementById("pendingTasks").textContent =
        tasks.filter(task => !task.completed).length;

    document.getElementById("completedTasks").textContent =
        tasks.filter(task => task.completed).length;
}

// Reset the task form after editing or adding a task.
function resetTaskForm() {
    taskForm.reset();
    editingTaskId = null;

    taskFormHeading.textContent = "Add a Study Task";
    saveTaskButton.textContent = "+ Add Task";
    cancelEditButton.hidden = true;
}

// Add a task or update the task currently being edited.
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const subject = taskSubject.value.trim();
    const deadline = taskDeadline.value;

    if (!title || !subject || !deadline) {
        alert("Please complete all task fields.");
        return;
    }

    if (deadline < getTodayString()) {
        alert("This deadline is in the past. You can still save it if the task is overdue.");
    }

    if (editingTaskId !== null) {
        const task = tasks.find(item => item.id === editingTaskId);

        if (!task) {
            alert("Task not found. Please try again.");
            resetTaskForm();
            return;
        }

        const oldTask = { ...task };

        task.title = title;
        task.subject = subject;
        task.deadline = deadline;

        if (!saveData()) {
            Object.assign(task, oldTask);
            return;
        }
    } else {
        tasks.push({
            id: makeId(),
            title,
            subject,
            deadline,
            completed: false
        });

        if (!saveData()) {
            tasks.pop();
            return;
        }
    }

    resetTaskForm();
    renderAll();
});

// Load a task into the form for editing.
function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) return;

    editingTaskId = id;
    taskTitle.value = task.title;
    taskSubject.value = task.subject;
    taskDeadline.value = task.deadline;

    taskFormHeading.textContent = "Edit Study Task";
    saveTaskButton.textContent = "Save Changes";
    cancelEditButton.hidden = false;

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    taskTitle.focus();
}

cancelEditButton.addEventListener("click", resetTaskForm);

// Display tasks using both the search box and status filter.
function renderTasks() {
    taskList.replaceChildren();

    const filter = taskFilter.value;
    const search = taskSearch.value.trim().toLowerCase();
    const today = getTodayString();

    const filteredTasks = tasks.filter(task => {
        const matchesFilter =
            filter === "all" ||
            (filter === "pending" && !task.completed) ||
            (filter === "completed" && task.completed);

        const matchesSearch =
            task.title.toLowerCase().includes(search) ||
            task.subject.toLowerCase().includes(search);

        return matchesFilter && matchesSearch;
    });

    if (filteredTasks.length === 0) {
        taskList.appendChild(
            createElement("p", "No matching tasks found.", "empty")
        );
        return;
    }

    // Show the nearest deadline first.
    filteredTasks.sort((a, b) =>
        a.deadline.localeCompare(b.deadline)
    );

    filteredTasks.forEach(task => {
        const isOverdue =
            !task.completed && task.deadline < today;

        const card = createElement(
            "article",
            "",
            [
                "task-item",
                task.completed ? "done" : "",
                isOverdue ? "overdue" : ""
            ].filter(Boolean).join(" ")
        );

        card.appendChild(createElement("h3", task.title));
        card.appendChild(
            createElement("p", "Subject: " + task.subject)
        );
        card.appendChild(
            createElement("p", "Deadline: " + task.deadline)
        );

        let statusText = "Pending";
        let statusClass = "status";

        if (task.completed) {
            statusText = "Completed";
            statusClass += " finished";
        } else if (isOverdue) {
            statusText = "Overdue";
            statusClass += " late";
        } else if (task.deadline === today) {
            statusText = "Due today";
        }

        card.appendChild(
            createElement("span", statusText, statusClass)
        );

        const actions = createElement("div", "", "actions");

        const completeButton = createElement(
            "button",
            task.completed ? "Mark Pending" : "Mark Complete",
            "complete"
        );

        completeButton.type = "button";

        completeButton.addEventListener("click", function () {
            const previousValue = task.completed;
            task.completed = !task.completed;

            if (!saveData()) {
                task.completed = previousValue;
                return;
            }

            renderAll();
        });

        const editButton = createElement("button", "Edit", "edit");
        editButton.type = "button";
        editButton.addEventListener("click", () => editTask(task.id));

        const deleteButton = createElement("button", "Delete", "delete");
        deleteButton.type = "button";

        deleteButton.addEventListener("click", function () {
            if (!confirm("Delete this task?")) return;

            const oldTasks = tasks;
            tasks = tasks.filter(item => item.id !== task.id);

            if (!saveData()) {
                tasks = oldTasks;
                return;
            }

            if (editingTaskId === task.id) {
                resetTaskForm();
            }

            renderAll();
        });

        actions.append(completeButton, editButton, deleteButton);
        card.appendChild(actions);
        taskList.appendChild(card);
    });
}

// Search and filter event listeners.
taskSearch.addEventListener("input", renderTasks);
taskFilter.addEventListener("change", renderTasks);

// Add a class to the timetable.
classForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const subject = document.getElementById("classSubject").value.trim();
    const day = document.getElementById("classDay").value;
    const time = document.getElementById("classTime").value;
    const room = document.getElementById("classRoom").value.trim();

    if (!subject || !day || !time) {
        alert("Please enter the subject, day and time.");
        return;
    }

    classes.push({
        id: makeId(),
        subject,
        day,
        time,
        room
    });

    if (!saveData()) {
        classes.pop();
        return;
    }

    classForm.reset();
    renderAll();
});

// Format a 24-hour time such as 14:30 as 2:30 PM.
function formatTime(time) {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date(2000, 0, 1, hour, minute);

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit"
    });
}

// Sort classes by day and then by time.
function getSortedClasses() {
    return [...classes].sort((a, b) => {
        const dayDifference =
            dayNames.indexOf(a.day) - dayNames.indexOf(b.day);

        return dayDifference || a.time.localeCompare(b.time);
    });
}

// Display the complete class list.
function renderTimetable() {
    timetable.replaceChildren();

    const sortedClasses = getSortedClasses();

    if (sortedClasses.length === 0) {
        timetable.appendChild(
            createElement("p", "No classes added yet.", "empty")
        );
        return;
    }

    sortedClasses.forEach(item => {
        const card = createElement("article", "", "class-item");

        card.appendChild(createElement("h3", item.subject));
        card.appendChild(createElement("p", "Day: " + item.day));
        card.appendChild(
            createElement("p", "Time: " + formatTime(item.time))
        );

        if (item.room) {
            card.appendChild(createElement("p", "Room: " + item.room));
        }

        const deleteButton = createElement(
            "button", "Delete Class", "delete"
        );

        deleteButton.type = "button";

        deleteButton.addEventListener("click", function () {
            if (!confirm("Delete this class?")) return;

            const oldClasses = classes;
            classes = classes.filter(c => c.id !== item.id);

            if (!saveData()) {
                classes = oldClasses;
                return;
            }

            renderAll();
        });

        card.appendChild(deleteButton);
        timetable.appendChild(card);
    });
}

// The weekly timetable remembers the selected day during rendering.
let selectedDay = dayNames[
    (new Date().getDay() + 6) % 7
];

function renderWeeklyTimetable() {
    weekDays.replaceChildren();
    weeklyTimetable.replaceChildren();

    dayNames.forEach(day => {
        const button = createElement(
            "button",
            day.slice(0, 3),
            selectedDay === day ? "active" : ""
        );

        button.type = "button";
        button.setAttribute(
            "aria-pressed",
            String(selectedDay === day)
        );
        button.title = day;

        button.addEventListener("click", function () {
            selectedDay = day;
            renderWeeklyTimetable();
        });

        weekDays.appendChild(button);
    });

    const dayClasses = getSortedClasses().filter(
        item => item.day === selectedDay
    );

    weeklyTimetable.appendChild(
        createElement("h3", selectedDay + "'s Classes")
    );

    if (dayClasses.length === 0) {
        weeklyTimetable.appendChild(
            createElement(
                "p",
                "No classes scheduled for " + selectedDay + ".",
                "empty"
            )
        );
        return;
    }

    dayClasses.forEach(item => {
        const card = createElement("article", "", "class-item");

        card.appendChild(createElement("h3", item.subject));
        card.appendChild(
            createElement("p", formatTime(item.time), "class-time")
        );

        if (item.room) {
            card.appendChild(createElement("p", "Room: " + item.room));
        }

        weeklyTimetable.appendChild(card);
    });
}

// Refresh every part of the website.
function renderAll() {
    renderStats();
    renderTasks();
    renderTimetable();
    renderWeeklyTimetable();
}

// Display existing saved tasks and classes.
renderAll();
