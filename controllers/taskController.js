// File: controllers/taskController.js
const User = require('../models/User');
const DailyTask = require('../models/DailyTask');
const Settings = require('../models/Settings');
const Reel = require('../models/Reel');
const Transaction = require('../models/Transaction');

// =====================================
// HELPERS
// =====================================

const getTodayDateString = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; 
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
};

const getOrCreateDailyTask = async (userId) => {
    const today = getTodayDateString();
    let task = await DailyTask.findOne({ user: userId, date: today });
    if (!task) {
        task = await DailyTask.create({ user: userId, date: today });
    }
    return task;
};

const processTaskIncome = async (user, amount, type, desc) => {
    if (amount < 0) return { success: false, message: 'Invalid reward amount' };

    const settings = await Settings.findOne() || { daily_income_limit: 5000 };
    
    if (user.today_income + amount > settings.daily_income_limit) {
        return { success: false, message: 'Daily income limit reached' };
    }

    if (user.is_prime && user.is_active) {
        user.available_balance += amount;
        user.wallet_balance = user.available_balance; // Syncs directly to available balance
    } else {
        user.locked_balance += amount;
        // DO NOT increase wallet_balance when income goes to locked_balance
    }
    
    user.today_income += amount;
    user.total_income += amount;
    
    await user.save();

    // Creates transaction history even if amount is 0
    await Transaction.create({
        user: user._id, type: type, amount: amount, description: desc, status: 'success'
    });

    return { success: true };
};

// =====================================
// CHECK-IN SYSTEM
// =====================================

exports.checkInStatus = async (req, res) => {
    try {
        const task = await getOrCreateDailyTask(req.user.userId);
        res.status(200).json({ success: true, check_in_completed: task.check_in_completed });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.doCheckIn = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const task = await getOrCreateDailyTask(user._id);
        if (task.check_in_completed) return res.status(400).json({ success: false, message: 'Already checked in today' });

        const settings = await Settings.findOne() || new Settings();

        const processResult = await processTaskIncome(user, settings.daily_checkin_reward, 'task_income', 'Daily Check-in Reward');
        if (!processResult.success) return res.status(400).json(processResult);

        task.check_in_completed = true;
        await task.save();
        
        res.status(200).json({ success: true, message: 'Check-in successful', reward: settings.daily_checkin_reward });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// =====================================
// REELS SYSTEM
// =====================================

exports.getReels = async (req, res) => {
    try {
        const today = getTodayDateString();
        const reels = await Reel.find({ is_active: true, assigned_date: today }).limit(5);
        res.status(200).json({ success: true, reels });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getReelProgress = async (req, res) => {
    try {
        const task = await getOrCreateDailyTask(req.user.userId);
        const completed = task.reels_progress.filter(r => r.completed).length;
        const total = 5;

        res.status(200).json({
            success: true,
            progress: { completed, total, remaining: total - completed },
            all_completed: task.all_reels_completed
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.startReel = async (req, res) => {
    try {
        const { reel_id } = req.body;
        if (!reel_id) return res.status(400).json({ success: false, message: 'Reel ID is required' });

        const today = getTodayDateString();
        const reel = await Reel.findOne({ _id: reel_id, assigned_date: today, is_active: true });
        if (!reel) return res.status(400).json({ success: false, message: 'Invalid or expired reel' });

        const task = await getOrCreateDailyTask(req.user.userId);
        const progressIndex = task.reels_progress.findIndex(r => r.reel_id.toString() === reel_id);
        
        if (progressIndex === -1) {
            task.reels_progress.push({ reel_id, start_time: new Date() });
        } else {
            task.reels_progress[progressIndex].start_time = new Date();
        }
        
        await task.save();
        res.status(200).json({ success: true, message: 'Reel tracking started' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.completeReel = async (req, res) => {
    try {
        const { reel_id } = req.body;
        if (!reel_id) return res.status(400).json({ success: false, message: 'Reel ID is required' });

        const today = getTodayDateString();
        const reel = await Reel.findOne({ _id: reel_id, assigned_date: today, is_active: true });
        if (!reel) return res.status(400).json({ success: false, message: 'Invalid or expired reel' });

        const user = await User.findById(req.user.userId);
        const task = await getOrCreateDailyTask(user._id);
        const settings = await Settings.findOne() || new Settings();

        if (task.all_reels_completed) return res.status(400).json({ success: false, message: 'All daily reels already completed' });

        const progress = task.reels_progress.find(r => r.reel_id.toString() === reel_id);
        if (!progress) return res.status(400).json({ success: false, message: 'Reel was not started' });
        if (progress.completed) return res.status(400).json({ success: false, message: 'Reel already marked completed' });

        const timeDiffSeconds = (new Date() - new Date(progress.start_time)) / 1000;
        if (timeDiffSeconds < 15) return res.status(400).json({ success: false, message: `Watch for at least 15 seconds.` });

        progress.completed = true;
        await task.save();

        const completedCount = task.reels_progress.filter(r => r.completed).length;
        
        if (completedCount >= 5 && !task.all_reels_completed) {
            const processResult = await processTaskIncome(user, settings.daily_reel_reward, 'task_income', 'Daily Reels Bonus');
            if (processResult.success) {
                task.all_reels_completed = true;
                await task.save();
                return res.status(200).json({ success: true, message: 'All 5 reels completed! Reward credited.', reward: settings.daily_reel_reward });
            } else {
                 return res.status(400).json(processResult);
            }
        }

        res.status(200).json({ success: true, message: `Reel completed successfully. ${completedCount}/5 done.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// =====================================
// SPIN WHEEL SYSTEM
// =====================================

exports.doSpin = async (req, res) => {
    try {
        const task = await getOrCreateDailyTask(req.user.userId);
        const settings = await Settings.findOne() || new Settings();

        if (task.spin_completed) return res.status(400).json({ success: false, message: 'Spin wheel already claimed today' });
        if (task.spins_used >= 2) return res.status(400).json({ success: false, message: 'Maximum 2 spins allowed' });

        const maxReward = settings.daily_spin_max_reward;
        const reward = Math.floor(Math.random() * (maxReward + 1));
        
        task.spins_used += 1;
        task.pending_spin_reward = reward; 
        await task.save();

        res.status(200).json({ 
            success: true, reward, spins_used: task.spins_used, max_spins: 2,
            message: task.spins_used === 1 ? `You won ₹${reward}! Accept or risk it to spin again.` : `Final Spin! You won ₹${reward}.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.riskSpin = async (req, res) => {
    try {
        const task = await getOrCreateDailyTask(req.user.userId);
        const settings = await Settings.findOne() || new Settings();

        if (task.spin_completed) return res.status(400).json({ success: false, message: 'Spin wheel already claimed today' });
        if (task.spins_used !== 1) return res.status(400).json({ success: false, message: 'Risk option only available after first spin' });

        const maxReward = settings.daily_spin_max_reward;
        const newReward = Math.floor(Math.random() * (maxReward + 1));

        task.spins_used = 2;
        task.pending_spin_reward = newReward;
        await task.save();

        res.status(200).json({
            success: true, reward: newReward, spins_used: 2, max_spins: 2,
            message: `Risk taken! Your final reward is ₹${newReward}. Please accept it.`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.acceptSpin = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const task = await getOrCreateDailyTask(user._id);

        if (task.spin_completed) return res.status(400).json({ success: false, message: 'Spin reward already claimed' });
        if (task.pending_spin_reward === null || task.spins_used === 0) return res.status(400).json({ success: false, message: 'Spin wheel first' });

        const finalReward = task.pending_spin_reward;
        const processResult = await processTaskIncome(user, finalReward, 'task_income', 'Spin Wheel Reward');

        if (!processResult.success) {
             return res.status(400).json(processResult);
        }

        task.spin_completed = true;
        task.pending_spin_reward = null;
        await task.save();

        res.status(200).json({ success: true, message: 'Spin reward credited', reward: finalReward });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};