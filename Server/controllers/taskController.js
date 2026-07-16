const Task = require("../models/Task");

// Get all tasks
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user._id });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create task
const createTask = async (req, res) => {
    try {
        const { title, priority, category, dueDate } = req.body;

        const task = await Task.create({
            title,
            priority,
            category,
            dueDate,
            user: req.user._id
        });

        res.status(201).json(task);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// Update task
const updateTask = async (req, res) => {
    try {

        const task = await Task.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        Object.assign(task, req.body);

        await task.save();

        res.json(task);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// Delete task
const deleteTask = async (req, res) => {

    try {

        const task = await Task.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        await task.deleteOne();

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask
};