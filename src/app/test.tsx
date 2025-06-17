"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  MdDateRange,
  MdChevronLeft,
  MdChevronRight,
  MdDownload,
  MdAdd,
  MdGroup,
  MdAssignment,
  MdWarning,
  MdCheckCircle,
  MdDelete,
  MdHelp,
  MdClose,
  MdMenu,
  MdExpandMore,
  MdExpandLess,
  MdSchedule,
} from "react-icons/md";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  assignedTo: string[];
  completed: boolean;
  progress: number;
  priority: "low" | "medium" | "high";
  dependencies: string[];
}

type ViewMode = "day" | "week" | "month";

const colors = {
  primary: "#4457FF", // Blue
  secondary: "#A5D6A7", // Pastel green
  accent: "#C8E6C9", // Very light green
  success: "#66BB6A", // Green
  warning: "#FFB74D", // Pastel orange
  danger: "#E57373", // Pastel red
  info: "#4FC3F7", // Pastel blue
  dark: "#90A4AE", // Pastel blue grey
  light: "#F5F5F5", // Very light grey
  white: "#FFFFFF",
  text: "#37474F", // Dark blue grey
  textSecondary: "#78909C", // Blue grey
};

const GanttChart: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragType, setDragType] = useState<
    "move" | "resize-left" | "resize-right" | null
  >(null);
  const [conflicts, setConflicts] = useState<{ [key: string]: string[] }>({});
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [collaboratorTasks, setCollaboratorTasks] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format date consistently
  const formatDate = (
    date: Date,
    format: "full" | "short" | "time" = "full"
  ) => {
    if (!mounted) return ""; // Return empty string during SSR

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "UTC",
      ...(format === "full"
        ? {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        : format === "short"
        ? {
            month: "short",
            day: "numeric",
          }
        : {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
    };

    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  // Check for mobile view - only run on client
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 767);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  // Initialize sample data - only run on client
  useEffect(() => {
    if (!mounted) return;

    const sampleMembers: TeamMember[] = [
      {
        id: "1",
        name: "Alice Johnson",
        avatar: "AJ",
        color: "#81C784",
        email: "alice@company.com",
      },
      {
        id: "2",
        name: "Bob Smith",
        avatar: "BS",
        color: "#E57373",
        email: "bob@company.com",
      },
      {
        id: "3",
        name: "Carol Davis",
        avatar: "CD",
        color: "#4FC3F7",
        email: "carol@company.com",
      },
      {
        id: "4",
        name: "David Wilson",
        avatar: "DW",
        color: "#66BB6A",
        email: "david@company.com",
      },
      {
        id: "5",
        name: "Eva Brown",
        avatar: "EB",
        color: "#FFB74D",
        email: "eva@company.com",
      },
    ];

    const today = new Date();
    const sampleTasks: Task[] = [
      {
        id: "1",
        title: "Project Planning",
        description: "Define project scope and requirements",
        startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        assignedTo: ["1", "2"],
        completed: true,
        progress: 100,
        priority: "high",
        dependencies: [],
      },
      {
        id: "2",
        title: "UI/UX Design",
        description: "Create wireframes and mockups",
        startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        assignedTo: ["3"],
        completed: false,
        progress: 75,
        priority: "high",
        dependencies: ["1"],
      },
      {
        id: "3",
        title: "Frontend Development",
        description: "Implement UI components",
        startDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        assignedTo: ["2", "4"],
        completed: false,
        progress: 30,
        priority: "medium",
        dependencies: ["2"],
      },
      {
        id: "4",
        title: "Backend API",
        description: "Build server-side logic",
        startDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 16 * 24 * 60 * 60 * 1000),
        assignedTo: ["1", "5"],
        completed: false,
        progress: 20,
        priority: "high",
        dependencies: ["1"],
      },
      {
        id: "5",
        title: "Testing & QA",
        description: "Comprehensive testing",
        startDate: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000),
        assignedTo: ["3", "4"],
        completed: false,
        progress: 0,
        priority: "medium",
        dependencies: ["3", "4"],
      },
    ];

    setMembers(sampleMembers);
    setTasks(sampleTasks);
  }, [mounted]);

  // Simulate collaborator adding tasks - only run on client
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      if (tasks.length > 0) {
        const collaborator =
          members[Math.floor(Math.random() * members.length)];
        const lastTask = tasks[tasks.length - 1];
        const newTask: Task = {
          id: `collab-${Date.now()}`,
          title: `Collaborator Task ${collaboratorTasks + 1}`,
          description: `Added by ${collaborator.name}`,
          startDate: new Date(lastTask.endDate.getTime() + 86400000),
          endDate: new Date(lastTask.endDate.getTime() + 86400000 * 3),
          assignedTo: [collaborator.id],
          completed: false,
          progress: 0,
          priority: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as
            | "low"
            | "medium"
            | "high",
          dependencies: [],
        };
        setTasks((prev) => [...prev, newTask]);
        setCollaboratorTasks((prev) => prev + 1);
        showNotificationMessage(`👋 ${collaborator.name} added a new task`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks, members, collaboratorTasks, mounted]);

  // Conflict detection
  useEffect(() => {
    const newConflicts: { [key: string]: string[] } = {};

    members.forEach((member) => {
      const memberTasks = tasks.filter((task) =>
        task.assignedTo.includes(member.id)
      );

      for (let i = 0; i < memberTasks.length; i++) {
        for (let j = i + 1; j < memberTasks.length; j++) {
          const taskA = memberTasks[i];
          const taskB = memberTasks[j];

          if (
            taskA.startDate < taskB.endDate &&
            taskB.startDate < taskA.endDate
          ) {
            if (!newConflicts[taskA.id]) newConflicts[taskA.id] = [];
            if (!newConflicts[taskB.id]) newConflicts[taskB.id] = [];

            if (!newConflicts[taskA.id].includes(taskB.id)) {
              newConflicts[taskA.id].push(taskB.id);
            }
            if (!newConflicts[taskB.id].includes(taskA.id)) {
              newConflicts[taskB.id].push(taskA.id);
            }
          }
        }
      }
    });

    setConflicts(newConflicts);

    if (Object.keys(newConflicts).length > 0) {
      showNotificationMessage("⚠️ Scheduling conflicts detected!");
    }
  }, [tasks, members]);

  // Helper functions
  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const getDateRange = useCallback(() => {
    const dates: Date[] = [];
    let startDate = new Date(currentDate);

    if (viewMode === "day") {
      startDate.setHours(0, 0, 0, 0);
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(startDate);
        hourDate.setHours(hour);
        dates.push(hourDate);
      }
    } else if (viewMode === "week") {
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dates.push(date);
      }
    } else if (viewMode === "month") {
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      while (startDate.getMonth() === currentDate.getMonth()) {
        dates.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    return dates;
  }, [currentDate, viewMode]);

  const getTaskStyle = useCallback(
    (task: Task) => {
      const dates = getDateRange();

      if (viewMode === "day") {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const taskStart = task.startDate.getTime();
        const taskEnd = task.endDate.getTime();
        const viewStart = dayStart.getTime();
        const viewEnd = dayEnd.getTime();

        if (taskEnd < viewStart || taskStart > viewEnd) {
          return null;
        }

        const visibleStart = Math.max(taskStart, viewStart);
        const visibleEnd = Math.min(taskEnd, viewEnd);

        const totalDayDuration = dayEnd.getTime() - dayStart.getTime();
        const left = ((visibleStart - viewStart) / totalDayDuration) * 100;
        const width = Math.max(
          ((visibleEnd - visibleStart) / totalDayDuration) * 100,
          8.33
        );

        const continuesLeft = taskStart < viewStart;
        const continuesRight = taskEnd > viewEnd;

        return {
          left: `${Math.max(0, left)}%`,
          width: `${Math.min(width, 100 - left)}%`,
          continuesLeft,
          continuesRight,
          isPartial: continuesLeft || continuesRight,
        };
      } else {
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        lastDate.setHours(23, 59, 59, 999);

        const totalDuration = lastDate.getTime() - firstDate.getTime();

        const taskStart = task.startDate.getTime();
        const taskEnd = task.endDate.getTime();
        const viewStart = firstDate.getTime();
        const viewEnd = lastDate.getTime();

        if (taskEnd < viewStart || taskStart > viewEnd) {
          return null;
        }

        const visibleStart = Math.max(taskStart, viewStart);
        const visibleEnd = Math.min(taskEnd, viewEnd);

        const left = ((visibleStart - viewStart) / totalDuration) * 100;
        const width = ((visibleEnd - visibleStart) / totalDuration) * 100;

        const continuesLeft = taskStart < viewStart;
        const continuesRight = taskEnd > viewEnd;

        return {
          left: `${Math.max(0, left)}%`,
          width: `${Math.max(1, width)}%`,
          continuesLeft,
          continuesRight,
          isPartial: continuesLeft || continuesRight,
        };
      }
    },
    [getDateRange, viewMode, currentDate]
  );

  // Task management
  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: "",
      startDate: today,
      endDate: tomorrow,
      assignedTo: [],
      completed: false,
      progress: 0,
      priority: "medium",
      dependencies: [],
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    showNotificationMessage("✅ Task added successfully!");
  };

  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
    },
    [tasks]
  );

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
    showNotificationMessage("🗑️ Task deleted");
  };

  const toggleTaskAssignment = (taskId: string, memberId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const assignedTo = task.assignedTo.includes(memberId)
      ? task.assignedTo.filter((id) => id !== memberId)
      : [...task.assignedTo, memberId];

    updateTask(taskId, { assignedTo });
  };

  // Drag and drop functionality
  const handleDragStart = (
    taskId: string,
    e: React.MouseEvent | React.TouchEvent,
    type: "move" | "resize-left" | "resize-right" = "move"
  ) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragTaskId(taskId);
    setDragType(type);

    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setDragStartDate(
        new Date(type === "resize-right" ? task.endDate : task.startDate)
      );
    }
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (
        !isDragging ||
        !dragTaskId ||
        !dragStartX ||
        !dragStartDate ||
        !timelineRef.current
      )
        return;

      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const timelineWidth = timelineRect.width;
      const offsetX = clientX - dragStartX;

      const dates = getDateRange();
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      lastDate.setHours(23, 59, 59, 999);

      const totalDuration = lastDate.getTime() - firstDate.getTime();
      const pixelsPerMs = timelineWidth / totalDuration;
      const msMoved = offsetX / pixelsPerMs;

      const task = tasks.find((t) => t.id === dragTaskId);
      if (!task) return;

      if (dragType === "move") {
        const newStartDate = new Date(dragStartDate.getTime() + msMoved);
        const taskDuration = task.endDate.getTime() - task.startDate.getTime();
        const newEndDate = new Date(newStartDate.getTime() + taskDuration);
        updateTask(dragTaskId, {
          startDate: newStartDate,
          endDate: newEndDate,
        });
      } else if (dragType === "resize-left") {
        const newStartDate = new Date(dragStartDate.getTime() + msMoved);
        const minEndDate = new Date(
          newStartDate.getTime() + 24 * 60 * 60 * 1000
        );
        if (newStartDate < task.endDate && task.endDate >= minEndDate) {
          updateTask(dragTaskId, { startDate: newStartDate });
        }
      } else if (dragType === "resize-right") {
        const newEndDate = new Date(dragStartDate.getTime() + msMoved);
        const minEndDate = new Date(
          task.startDate.getTime() + 24 * 60 * 60 * 1000
        );
        if (newEndDate > task.startDate && newEndDate >= minEndDate) {
          updateTask(dragTaskId, { endDate: newEndDate });
        }
      }
    },
    [
      isDragging,
      dragTaskId,
      dragStartX,
      dragStartDate,
      dragType,
      getDateRange,
      tasks,
      updateTask,
    ]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragTaskId(null);
    setDragStartX(0);
    setDragStartDate(null);
    setDragType(null);

    if (dragTaskId) {
      showNotificationMessage("Task updated");
    }
  }, [dragTaskId]);

  // Event listeners for drag and drop
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Navigation
  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);

    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7 * direction);
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    }

    setCurrentDate(newDate);
  };

  // Export functionality
  const exportData = (format: "csv" | "pdf") => {
    const data = tasks.map((task) => ({
      "Task ID": task.id,
      Title: task.title,
      Description: task.description,
      "Start Date": task.startDate.toISOString().split("T")[0],
      "End Date": task.endDate.toISOString().split("T")[0],
      "Assigned To": task.assignedTo
        .map((id) => members.find((m) => m.id === id)?.name)
        .join(", "),
      Progress: `${task.progress}%`,
      Priority: task.priority,
      Completed: task.completed ? "Yes" : "No",
      "Duration (days)": Math.ceil(
        (task.endDate.getTime() - task.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    }));

    if (format === "csv") {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map((row) =>
        Object.values(row)
          .map((value) =>
            typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value
          )
          .join(",")
      );
      const csvContent = [headers, ...rows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "gantt_chart.csv");
    } else if (format === "pdf") {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(colors.text);
      doc.text("Gantt Chart Export", 14, 20);

      // Add date
      doc.setFontSize(12);
      doc.setTextColor(colors.textSecondary);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

      // Add table
      const columns = [
        { header: "Task ID", dataKey: "Task ID" },
        { header: "Title", dataKey: "Title" },
        { header: "Start Date", dataKey: "Start Date" },
        { header: "End Date", dataKey: "End Date" },
        { header: "Assigned To", dataKey: "Assigned To" },
        { header: "Progress", dataKey: "Progress" },
        { header: "Priority", dataKey: "Priority" },
        { header: "Completed", dataKey: "Completed" },
        { header: "Duration", dataKey: "Duration (days)" },
      ];

      autoTable(doc, {
        head: [columns.map((col) => col.header)],
        body: data.map((row) =>
          columns.map((col) => row[col.dataKey as keyof typeof row])
        ),
        startY: 35,
        theme: "grid",
        headStyles: {
          fillColor: colors.primary,
          textColor: colors.white,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: colors.light,
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: "linebreak",
        },
        margin: { left: 14 },
      });

      doc.save("gantt_chart.pdf");
      showNotificationMessage("📊 PDF file exported");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigateDate(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateDate(1);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setViewMode("day");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        setViewMode("week");
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setViewMode("month");
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setCurrentDate(new Date());
      } else if (e.key === "Escape") {
        setShowInstructions(false);
        setShowExportModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const dates = getDateRange();

  const getFilteredTasksForMobile = () => {
    return tasks.filter((task) => {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      return taskStart <= currentDate && taskEnd >= currentDate;
    });
  };

  const MobileTaskView = ({ task }: { task: Task }) => {
    const [expanded, setExpanded] = useState(false);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState<
      string | null
    >(null);
    const [tempDate, setTempDate] = useState<Date>(new Date());
    // const member = members.find((m) => task.assignedTo.includes(m.id));

    const handleDateChange = (type: "start" | "end", newDate: Date) => {
      if (type === "start") {
        if (newDate < task.endDate) {
          updateTask(task.id, { startDate: newDate });
        }
      } else {
        if (newDate > task.startDate) {
          updateTask(task.id, { endDate: newDate });
        }
      }
      setShowCustomDatePicker(null);
    };

    const openDatePicker = (type: "start" | "end") => {
      setTempDate(type === "start" ? task.startDate : task.endDate);
      setShowCustomDatePicker(`${task.id}-${type}`);
    };

    const handleTaskClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("[data-interactive]") ||
        target.hasAttribute("data-interactive")
      ) {
        return;
      }
      setExpanded(!expanded);
    };

    // Custom Date Picker Component
    const CustomDatePicker = ({ type }: { type: "start" | "end" }) => {
      const currentYear = tempDate.getFullYear();
      const currentMonth = tempDate.getMonth();
      const currentDay = tempDate.getDate();
      const currentHour = tempDate.getHours();
      const currentMinute = tempDate.getMinutes();

      // Control body overflow when date picker is open
      useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = "unset";
        };
      }, []);

      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
      };

      const updateTempDate = (
        year?: number,
        month?: number,
        day?: number,
        hour?: number,
        minute?: number
      ) => {
        const newDate = new Date(tempDate);
        if (year !== undefined) newDate.setFullYear(year);
        if (month !== undefined) newDate.setMonth(month);
        if (day !== undefined) newDate.setDate(day);
        if (hour !== undefined) newDate.setHours(hour);
        if (minute !== undefined) newDate.setMinutes(minute);
        setTempDate(newDate);
      };

      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1000 p-4">
          <div className="bg-white rounded-xl p-6 max-w-xs w-full max-h-[80vh] overflow-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Select {type === "start" ? "Start" : "End"} Date
              </h3>
              <button
                onClick={() => setShowCustomDatePicker(null)}
                className="border-none bg-gray-100 rounded-lg p-2 cursor-pointer text-gray-500 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
              {/* Month and Year */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={currentMonth}
                  onChange={(e) =>
                    updateTempDate(undefined, parseInt(e.target.value))
                  }
                  className="p-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 outline-none"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={currentYear}
                  onChange={(e) => updateTempDate(parseInt(e.target.value))}
                  className="p-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 outline-none"
                />
              </div>

              {/* Day Selection */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-xs font-semibold text-gray-500"
                  >
                    {day}
                  </div>
                ))}
                {Array.from(
                  { length: getDaysInMonth(currentYear, currentMonth) },
                  (_, i) => i + 1
                ).map((day) => (
                  <button
                    key={day}
                    onClick={() => updateTempDate(undefined, undefined, day)}
                    className={`p-2 rounded-lg cursor-pointer text-sm transition-all ${
                      day === currentDay
                        ? "bg-blue-500 text-white font-semibold"
                        : "text-gray-800"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Hour
                  </label>
                  <select
                    value={currentHour}
                    onChange={(e) =>
                      updateTempDate(
                        undefined,
                        undefined,
                        undefined,
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">
                    Minute
                  </label>
                  <select
                    value={currentMinute}
                    onChange={(e) =>
                      updateTempDate(
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 outline-none"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCustomDatePicker(null)}
                className="p-3 border border-gray-200 rounded-xl bg-white text-gray-500 cursor-pointer text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDateChange(type, tempDate)}
                className="p-3 border-none rounded-xl bg-blue-500 text-white cursor-pointer text-sm font-semibold"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        className={`mb-4 bg-white rounded-xl shadow-sm ${
          conflicts[task.id]
            ? "border-l-4 border-red-400"
            : task.completed
            ? "border-l-4 border-green-500"
            : task.priority === "high"
            ? "border-l-4 border-yellow-500"
            : task.priority === "medium"
            ? "border-l-4 border-blue-400"
            : "border-l-4 border-pink-500"
        } overflow-hidden`}
      >
        <div
          className="p-4 flex justify-between items-center cursor-pointer"
          onClick={handleTaskClick}
        >
          <div className="flex-1 min-w-0">
            <h4 className="m-0 text-sm font-semibold text-gray-800 break-words leading-tight">
              {task.title}
            </h4>
            <div className="text-xs text-gray-500 mt-1">
              {task.startDate.toLocaleDateString()} -{" "}
              {task.endDate.toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="border-none bg-transparent text-gray-500 cursor-pointer p-2 ml-2 flex-shrink-0"
          >
            {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </button>
        </div>

        {expanded && (
          <div className="px-4 pb-4">
            <div className="flex justify-between items-center mb-2 text-xs text-gray-500 font-medium">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-300"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: task.completed
                    ? colors.success
                    : colors.primary,
                }}
              />
            </div>

            {task.description && (
              <div className="my-4 text-sm text-gray-800 break-words leading-relaxed">
                {task.description}
              </div>
            )}

            {/* Date pickers for mobile */}
            <div data-interactive="true" className="flex flex-col gap-4 my-4">
              <div data-interactive="true">
                <div className="text-xs text-gray-500 mb-2 font-medium">
                  Start Date
                </div>
                <button
                  data-interactive="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDatePicker("start");
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 cursor-pointer text-sm font-medium text-left flex items-center justify-between transition-all hover:border-gray-300"
                >
                  <span>
                    {task.startDate.toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <MdSchedule size={16} color={colors.primary} />
                </button>
              </div>

              <div data-interactive="true">
                <div className="text-xs text-gray-500 mb-2 font-medium">
                  End Date
                </div>
                <button
                  data-interactive="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDatePicker("end");
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 cursor-pointer text-sm font-medium text-left flex items-center justify-between transition-all hover:border-gray-300"
                >
                  <span>
                    {task.endDate.toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <MdSchedule size={16} color={colors.primary} />
                </button>
              </div>
            </div>

            {/* Assigned Members */}
            {task.assignedTo.length > 0 && (
              <div data-interactive="true" className="mb-4">
                <div className="text-xs text-gray-500 mb-2 font-medium">
                  Assigned To
                </div>
                <div className="flex flex-wrap gap-2">
                  {task.assignedTo.map((memberId) => {
                    const member = members.find((m) => m.id === memberId);
                    return member ? (
                      <div
                        key={memberId}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-opacity-10 rounded-xl text-xs border"
                        style={{
                          backgroundColor: `${member.color}15`,
                          borderColor: `${member.color}30`,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.avatar}
                        </div>
                        <span className="text-gray-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {member.name}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div data-interactive="true" className="grid grid-cols-2 gap-3">
              <button
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTask(task.id, {
                    completed: !task.completed,
                    progress: task.completed ? 0 : 100,
                  });
                }}
                className={`p-3 border-none rounded-xl text-white cursor-pointer text-xs flex items-center justify-center gap-2 font-medium transition-all ${
                  task.completed ? "bg-green-500" : "bg-green-400"
                }`}
              >
                <MdCheckCircle size={16} />
                <span className="whitespace-nowrap">
                  {task.completed ? "Completed" : "Complete"}
                </span>
              </button>

              <button
                data-interactive="true"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(task.id);
                }}
                className="p-3 border-none rounded-xl bg-red-400 text-white cursor-pointer text-xs flex items-center justify-center gap-2 font-medium transition-all"
              >
                <MdDelete size={16} /> Delete
              </button>
            </div>
          </div>
        )}
        {/* Custom Date Picker Modal */}
        {showCustomDatePicker === `${task.id}-start` && (
          <CustomDatePicker type="start" />
        )}
        {showCustomDatePicker === `${task.id}-end` && (
          <CustomDatePicker type="end" />
        )}
      </div>
    );
  };

  // Update date display in the UI to use the new formatDate function
  const renderDateHeader = () => {
    if (!mounted) return null;

    if (viewMode === "day") {
      return formatDate(currentDate, "full");
    } else if (viewMode === "week") {
      const dates = getDateRange();
      const startOfWeek = dates[0];
      const endOfWeek = dates[dates.length - 1];

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${formatDate(
          startOfWeek,
          "full"
        )} - Week of ${startOfWeek.getDate()}-${endOfWeek.getDate()}`;
      } else {
        return `${formatDate(startOfWeek, "short")} - ${formatDate(
          endOfWeek,
          "short"
        )}, ${endOfWeek.getFullYear()}`;
      }
    } else {
      return formatDate(currentDate, "full");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-100 relative"
      style={{ fontFamily: '"Poppins", "Inter", Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="bg-white text-gray-800 p-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm rounded-b-xl mx-2 mt-0 mb-2 relative z-100 gap-4">
        <div className="flex items-center gap-4 w-auto">
          {isMobileView && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 border-none bg-transparent text-gray-800 cursor-pointer flex items-center justify-center"
            >
              <MdMenu size={24} />
            </button>
          )}
          <h1
            className="m-0 text-xl font-bold"
            style={{
              color: colors.primary,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              minWidth: "fit-content",
            }}
          >
            <MdDateRange className="mr-2 align-middle" />
            Gantt Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation and View Mode Controls */}
          <div className="flex flex-wrap items-center gap-3 w-auto justify-center">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 border-none rounded-full bg-gray-100 text-gray-800 cursor-pointer flex items-center justify-center transition-all w-9 h-9 hover:bg-gray-200 ease-in-out focus:outline-none"
              >
                <MdChevronLeft size={20} />
              </button>

              <button
                onClick={() => setCurrentDate(new Date())}
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "8px",
                  background: colors.primary,
                  color: colors.white,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                className="hover:bg-blue-600 transition-colors ease-in-out focus:outline-none"
              >
                Today
              </button>

              <button
                onClick={() => navigateDate(1)}
                className="p-2 border-none rounded-full bg-gray-100 text-gray-800 cursor-pointer flex items-center justify-center transition-all w-9 h-9 hover:bg-gray-200 ease-in-out focus:outline-none"
              >
                <MdChevronRight size={20} />
              </button>
            </div>
          </div>
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor:
                    viewMode === mode ? colors.primary : "transparent",
                  color:
                    viewMode === mode ? colors.white : colors.textSecondary,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  fontWeight: viewMode === mode ? 600 : 500,
                  fontSize: "0.8rem",
                  transition: "all 0.2s ease",
                }}
                className={`hover:bg-gray-200 transition-colors ease-in-out focus:outline-none ${
                  viewMode === mode ? "hover:bg-blue-600" : ""
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-auto justify-center">
            <button
              onClick={() => setShowInstructions(true)}
              className="p-2 border-none rounded-full bg-gray-100 text-gray-800 cursor-pointer flex items-center justify-center transition-all w-9 h-9 hover:bg-gray-200 ease-in-out"
              title="Keyboard Shortcuts"
            >
              <MdHelp size={20} />
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 border-none rounded-lg bg-green-600 text-white cursor-pointer font-semibold text-sm flex items-center gap-2 transition-all duration-300 ease-in-out whitespace-nowrap hover:bg-green-700"
            >
              <MdDownload size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-1 overflow-hidden gap-2 px-2 pb-2 relative ${
          isMobileView ? "flex-col" : "flex-row"
        }`}
      >
        {/* Sidebar - Collapsible on mobile */}
        <div
          className={`${
            isMobileView ? (isMobileMenuOpen ? "w-72" : "w-0") : "w-80"
          } ${
            isMobileView ? "min-h-auto" : "min-h-[600px]"
          } bg-white rounded-xl flex flex-col overflow-hidden shadow-sm ${
            isMobileView
              ? "absolute left-0 top-0 bottom-0 z-50 transition-all duration-300 border-r border-gray-200"
              : "relative"
          }`}
          style={isMobileView && !isMobileMenuOpen ? { left: "-280px" } : {}}
        >
          {/* Add Task */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white">
            <h3 className="m-0 mb-4 text-base font-semibold flex items-center gap-2 text-gray-800">
              <div
                className="p-1.5 rounded-lg text-white flex items-center justify-center"
                style={{ background: colors.primary }}
              >
                <MdAdd size={16} />
              </div>
              Add New Task
            </h3>
            <div
              className={`flex gap-3 ${isMobileView ? "flex-col" : "flex-row"}`}
            >
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                onKeyPress={(e) => e.key === "Enter" && addTask()}
                className="flex-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-gray-800 outline-none transition-all font-sans placeholder-gray-400"
              />
              <button
                onClick={addTask}
                style={{
                  padding: "0.75rem 1.25rem",
                  border: "none",
                  borderRadius: "12px",
                  background: colors.primary,
                  color: colors.white,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                className="hover:bg-blue-600 transition-colors ease-in-out"
              >
                Add
              </button>
            </div>
          </div>

          {/* Team Members */}
          <div
            className={`${
              isMobileView ? "p-4" : "p-6"
            } border-b border-gray-200 flex-shrink-0`}
          >
            <h3
              className={`m-0 mb-4 ${
                isMobileView ? "text-sm" : "text-base"
              } font-semibold flex items-center gap-2 text-gray-800`}
            >
              <div
                className={`${
                  isMobileView ? "p-1" : "p-1.5"
                } bg-blue-400 rounded-lg text-white flex items-center justify-center`}
              >
                <MdGroup size={isMobileView ? 14 : 16} />
              </div>
              Team Members
            </h3>
            <div
              className={`flex ${
                isMobileView
                  ? "flex-nowrap gap-1 pb-1 overflow-x-auto overflow-y-hidden"
                  : "flex-wrap gap-2"
              }`}
            >
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-2 ${
                    isMobileView
                      ? "px-1.5 py-1 rounded-lg text-xs"
                      : "px-3 py-2 rounded-xl text-sm"
                  } bg-opacity-10 border text-gray-800 transition-all flex-shrink-0 whitespace-nowrap`}
                  style={{
                    backgroundColor: `${member.color}10`,
                    borderColor: `${member.color}30`,
                  }}
                >
                  <div
                    className={`rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                      isMobileView ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm"
                    }`}
                    style={{ backgroundColor: member.color }}
                  >
                    {member.avatar}
                  </div>
                  <span
                    className={`font-medium ${
                      isMobileView ? "hidden" : "inline"
                    }`}
                  >
                    {member.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-auto min-h-0 max-h-[calc(100vh-320px)]">
            <div
              className={`${
                isMobileView ? "p-4 pt-2" : "p-6 pt-3"
              } sticky top-0 bg-white z-1 border-b border-gray-200`}
            >
              <h3
                className={`m-0 ${
                  isMobileView ? "text-sm" : "text-base"
                } font-semibold flex items-center gap-2 text-gray-800`}
              >
                <div
                  className={`${
                    isMobileView ? "p-1" : "p-1.5"
                  } bg-green-600 rounded-lg text-white flex items-center justify-center`}
                >
                  <MdAssignment size={isMobileView ? 14 : 16} />
                </div>
                Tasks ({tasks.length})
              </h3>
            </div>
            <div className={isMobileView ? "px-4 pb-4" : "px-6 py-6"}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`mb-4 ${
                    isMobileView ? "p-3 rounded-lg" : "p-4 rounded-xl"
                  } ${
                    selectedTask === task.id ? "bg-green-50" : "bg-white"
                  } border ${
                    conflicts[task.id]
                      ? "border-red-400"
                      : selectedTask === task.id
                      ? "border-green-500"
                      : "border-gray-200"
                  } cursor-pointer transition-all ${
                    selectedTask === task.id ? "shadow-md" : "shadow-sm"
                  } ${
                    conflicts[task.id]
                      ? "border-l-4 border-red-400"
                      : task.completed
                      ? "border-l-4 border-green-500"
                      : task.priority === "high"
                      ? "border-l-4 border-yellow-500"
                      : task.priority === "medium"
                      ? "border-l-4 border-blue-400"
                      : "border-l-4 border-pink-500"
                  }`}
                  onClick={() =>
                    setSelectedTask(selectedTask === task.id ? null : task.id)
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4
                      className={`m-0 ${
                        isMobileView ? "text-xs" : "text-sm"
                      } font-semibold text-gray-800 leading-tight break-words flex-1 pr-2`}
                    >
                      {task.title}
                    </h4>
                    {conflicts[task.id] && (
                      <MdWarning
                        className={`${
                          isMobileView ? "text-sm" : "text-base"
                        } flex-shrink-0`}
                        style={{ color: colors.danger }}
                      />
                    )}
                  </div>

                  <div
                    className={`${
                      isMobileView ? "text-xs" : "text-sm"
                    } text-gray-500 mb-2 leading-tight`}
                  >
                    {task.startDate.toLocaleDateString()} -{" "}
                    {task.endDate.toLocaleDateString()}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div
                      className={`flex justify-between ${
                        isMobileView ? "text-2xs" : "text-xs"
                      } mb-1 text-gray-500`}
                    >
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div
                      className={`${
                        isMobileView ? "h-1" : "h-1.5"
                      } bg-gray-100 rounded-full overflow-hidden`}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${task.progress}%`,
                          backgroundColor: task.completed
                            ? colors.success
                            : colors.primary,
                        }}
                      />
                    </div>
                  </div>

                  {/* Assigned Members */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {task.assignedTo.map((memberId) => {
                      const member = members.find((m) => m.id === memberId);
                      return member ? (
                        <button
                          key={memberId}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskAssignment(task.id, member.id);
                          }}
                          className={`rounded-full flex items-center justify-center text-white font-semibold cursor-pointer leading-none border border-white ${
                            isMobileView ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm"
                          }`}
                          style={{ backgroundColor: member.color }}
                          title={`Remove ${member.name}`}
                        >
                          {member.avatar}
                        </button>
                      ) : null;
                    })}

                    {/* Add assignment buttons for unassigned members */}
                    {members
                      .filter((m) => !task.assignedTo.includes(m.id))
                      .map((member) => (
                        <button
                          key={member.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskAssignment(task.id, member.id);
                          }}
                          className={`rounded-full flex items-center justify-center font-semibold cursor-pointer leading-none opacity-60 hover:opacity-100 transition-all duration-300 ease-in-out ${
                            isMobileView ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm"
                          }`}
                          style={{
                            backgroundColor: "transparent",
                            color: member.color,
                            border: `1px solid ${member.color}`,
                          }}
                          title={`Assign ${member.name}`}
                        >
                          {member.avatar}
                        </button>
                      ))}
                  </div>

                  {/* Task Controls (when selected) */}
                  {selectedTask === task.id && (
                    <div
                      className={`${
                        isMobileView ? "mt-3 pt-3" : "mt-4 pt-4"
                      } border-t border-gray-200 flex gap-2 flex-wrap`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTask(task.id, {
                            completed: !task.completed,
                            progress: task.completed ? 0 : 100,
                          });
                        }}
                        className={`${
                          isMobileView
                            ? "px-2 py-1 text-2xs"
                            : "px-2 py-1.5 text-xs"
                        } border-none rounded-lg text-white cursor-pointer flex items-center gap-1 font-medium flex-1 justify-center whitespace-nowrap overflow-hidden text-ellipsis ${
                          task.completed ? "bg-green-500" : "bg-gray-500"
                        }`}
                      >
                        <MdCheckCircle size={isMobileView ? 12 : 14} />
                        {isMobileView
                          ? task.completed
                            ? "Done"
                            : "Mark"
                          : task.completed
                          ? "Complete"
                          : "Mark Complete"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className={`${
                          isMobileView
                            ? "px-2 py-1 text-2xs"
                            : "px-2 py-1.5 text-xs"
                        } border-none rounded-lg bg-red-500 text-white cursor-pointer flex items-center gap-1 font-medium flex-1 justify-center whitespace-nowrap`}
                      >
                        <MdDelete size={isMobileView ? 12 : 14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay for mobile menu */}
        {isMobileView && isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Timeline Area */}
        {!isMobileView ? (
          <div
            className="flex-1 bg-white rounded-xl flex flex-col overflow-hidden shadow-sm min-h-[600px]"
            ref={timelineRef}
          >
            {/* Month/Date Heading */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6 text-center font-semibold text-base text-gray-800 flex-shrink-0">
              {renderDateHeader()}
            </div>

            {/* Timeline Header */}
            <div
              className="sticky top-[76px] z-10 bg-white border-b border-gray-200 grid min-w-full flex-shrink-0"
              style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}
            >
              {dates.map((date, index) => {
                const isToday =
                  date.toDateString() === new Date().toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayOfWeek = date.toLocaleDateString("en-US", {
                  weekday: "short",
                });

                return (
                  <div
                    key={index}
                    className={`py-4 px-2 text-center ${
                      isToday
                        ? "bg-blue-50 font-semibold text-blue-500"
                        : isWeekend
                        ? "bg-gray-100/50 text-gray-500"
                        : "text-gray-800"
                    } font-medium min-w-[30px] text-sm relative`}
                    style={{
                      minWidth:
                        viewMode === "day"
                          ? "auto"
                          : viewMode === "week"
                          ? "100px"
                          : "30px",
                    }}
                  >
                    {viewMode === "day" && (
                      <div className="text-xs">
                        {date.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          hour12: true,
                        })}
                      </div>
                    )}
                    {viewMode === "week" && (
                      <>
                        <div className="text-xs mb-1 text-gray-500">
                          {dayOfWeek}
                        </div>
                        <div className="text-base font-semibold">
                          {date.getDate()}
                        </div>
                      </>
                    )}
                    {viewMode === "month" && (
                      <>
                        <div className="text-xs mb-1 text-gray-500">
                          {dayOfWeek}
                        </div>
                        <div
                          className={`text-sm ${
                            isToday
                              ? "font-bold text-blue-500"
                              : "font-medium text-gray-800"
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Timeline Content */}
            <div
              className="relative flex-1 min-w-full overflow-auto"
              ref={ganttRef}
              style={{
                minHeight: `${Math.max(tasks.length * 60 + 80, 300)}px`,
              }}
            >
              {/* Grid Lines */}
              {dates.map((date, index) => {
                return (
                  <div
                    key={`grid-${index}`}
                    className="absolute top-0 bottom-0 bg-gray-200 z-1"
                    style={{
                      left: `${(index / dates.length) * 100}%`,
                      width: "1px",
                    }}
                  />
                );
              })}

              {/* Task Bars */}
              {tasks.map((task, index) => {
                const styleResult = getTaskStyle(task);
                if (!styleResult) return null;

                const {
                  left,
                  width,
                  continuesLeft,
                  continuesRight,
                  isPartial,
                } = styleResult;
                const hasConflict = !!conflicts[task.id];

                return (
                  <div
                    key={task.id}
                    className="absolute z-5"
                    style={{
                      top: `${index * 60 + 20}px`,
                      left: left,
                      width: width,
                      height: "32px",
                    }}
                  >
                    <div
                      className={`h-full ${
                        hasConflict
                          ? "bg-red-400"
                          : task.completed
                          ? "bg-green-500"
                          : task.priority === "high"
                          ? "bg-yellow-500"
                          : task.priority === "medium"
                          ? "bg-blue-400"
                          : "bg-pink-500"
                      } flex items-center px-3 shadow-sm transition-all relative overflow-hidden min-w-[40px] ${
                        selectedTask === task.id
                          ? "border border-green-500 translate-y-[-2px] shadow-md"
                          : "border border-white/20"
                      }`}
                      style={{
                        borderRadius:
                          continuesLeft && continuesRight
                            ? "8px"
                            : continuesLeft
                            ? "0 12px 12px 0"
                            : continuesRight
                            ? "12px 0 0 12px"
                            : "12px",
                        cursor:
                          isDragging && dragTaskId === task.id
                            ? "grabbing"
                            : "grab",
                      }}
                      onMouseDown={(e) => handleDragStart(task.id, e, "move")}
                      onTouchStart={(e) => handleDragStart(task.id, e, "move")}
                      onClick={() =>
                        setSelectedTask(
                          selectedTask === task.id ? null : task.id
                        )
                      }
                      title={`${task.title} (${task.progress}%)${
                        isPartial ? " - Continues beyond view" : ""
                      }`}
                    >
                      {/* Continuation indicators */}
                      {continuesLeft && (
                        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-white z-2 opacity-80" />
                      )}

                      {continuesRight && (
                        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent border-l-white z-2 opacity-80" />
                      )}

                      {/* Left resize handle */}
                      {!continuesLeft && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2.5 cursor-w-resize bg-white/50 rounded-l-xl z-3 transition-opacity"
                          style={{ opacity: selectedTask === task.id ? 1 : 0 }}
                          onMouseDown={(e) =>
                            handleDragStart(task.id, e, "resize-left")
                          }
                          onTouchStart={(e) =>
                            handleDragStart(task.id, e, "resize-left")
                          }
                        />
                      )}

                      {/* Right resize handle */}
                      {!continuesRight && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2.5 cursor-e-resize bg-white/50 rounded-r-xl z-3 transition-opacity"
                          style={{ opacity: selectedTask === task.id ? 1 : 0 }}
                          onMouseDown={(e) =>
                            handleDragStart(task.id, e, "resize-right")
                          }
                          onTouchStart={(e) =>
                            handleDragStart(task.id, e, "resize-right")
                          }
                        />
                      )}

                      {/* Progress indicator */}
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-white/30 transition-all duration-300"
                        style={{
                          width: `${task.progress}%`,
                          borderRadius:
                            continuesLeft && continuesRight
                              ? "0"
                              : continuesLeft
                              ? "0 12px 12px 0"
                              : continuesRight
                              ? "12px 0 0 12px"
                              : "12px",
                        }}
                      />

                      <div
                        className={`text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis z-1 pointer-events-none ${
                          continuesLeft ? "pl-3" : ""
                        } ${continuesRight ? "pr-3" : ""}`}
                      >
                        {task.title}
                      </div>

                      {/* Assigned members indicator */}
                      <div className="ml-auto flex gap-1 z-1 pointer-events-none">
                        {task.assignedTo.slice(0, 3).map((memberId) => {
                          const member = members.find((m) => m.id === memberId);
                          return member ? (
                            <div
                              key={memberId}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white border border-white flex-shrink-0 leading-none"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.avatar}
                            </div>
                          ) : null;
                        })}
                        {task.assignedTo.length > 3 && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white border border-white flex-shrink-0 leading-none bg-gray-500">
                            +{task.assignedTo.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Task continuation summary at bottom */}
              <div className="absolute bottom-3 left-3 right-3 h-8 bg-white border border-gray-200 rounded-xl flex items-center px-4 text-xs text-gray-500 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  {(() => {
                    const dates = getDateRange();
                    const firstDate = dates[0];
                    const lastDate = dates[dates.length - 1];
                    lastDate.setHours(23, 59, 59, 999);

                    const continuesPrevious = tasks.filter(
                      (task) =>
                        task.startDate < firstDate && task.endDate >= firstDate
                    ).length;

                    const continuesNext = tasks.filter(
                      (task) =>
                        task.startDate <= lastDate && task.endDate > lastDate
                    ).length;

                    return (
                      <>
                        {continuesPrevious > 0 && (
                          <span>
                            ← {continuesPrevious} task
                            {continuesPrevious !== 1 ? "s" : ""} from previous
                          </span>
                        )}
                        {continuesNext > 0 && (
                          <span>
                            {continuesNext} task{continuesNext !== 1 ? "s" : ""}{" "}
                            continue next →
                          </span>
                        )}
                        {continuesPrevious === 0 && continuesNext === 0 && (
                          <span>All tasks within current view</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mobile task list view
          <div
            className={`flex-1 bg-white rounded-xl p-4 overflow-auto shadow-sm max-w-full ${
              isMobileMenuOpen ? "shadow-lg translate-x-72" : ""
            }`}
          >
            <h2 className="m-0 mb-6 text-xl font-semibold text-gray-800 text-center break-words">
              {(() => {
                if (viewMode === "day") {
                  return currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  });
                } else if (viewMode === "week") {
                  const dates = getDateRange();
                  const startOfWeek = dates[0];
                  const endOfWeek = dates[dates.length - 1];
                  return `${startOfWeek.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })} - ${endOfWeek.toLocaleDateString("en-US", {
                    day: "numeric",
                  })}`;
                } else {
                  return currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                }
              })()}
            </h2>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden">
              {getFilteredTasksForMobile().length > 0 ? (
                getFilteredTasksForMobile().map((task) => (
                  <MobileTaskView key={task.id} task={task} />
                ))
              ) : (
                <div className="text-center py-12 px-4 text-gray-500">
                  <div className="text-3xl mb-4">📅</div>
                  <div className="text-base mb-2">No tasks found</div>
                  <div className="text-sm">
                    No tasks scheduled for this time period
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-1000 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="m-0 text-xl font-semibold text-gray-800">
                Export Data
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="border-none bg-gray-100 rounded-lg p-2 cursor-pointer text-gray-500 transition-all"
              >
                <MdClose />
              </button>
            </div>

            <p className="m-0 mb-6 text-gray-500 text-sm">
              Choose the format for exporting your Gantt chart data:
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => exportData("csv")}
                className="p-4 border-2 border-blue-500 rounded-xl bg-white text-blue-500 cursor-pointer font-semibold flex flex-col items-center gap-2 min-w-[120px] transition-all"
              >
                <MdDownload className="text-2xl" />
                <span>CSV</span>
                <span className="text-xs opacity-80">Spreadsheet</span>
              </button>

              <button
                onClick={() => exportData("pdf")}
                className="p-4 border-2 border-blue-500 rounded-xl bg-white text-blue-500 cursor-pointer font-semibold flex flex-col items-center gap-2 min-w-[120px] transition-all"
              >
                <MdDownload className="text-2xl" />
                <span>PDF</span>
                <span className="text-xs opacity-80">Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-1000 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInstructions(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[85vh] overflow-auto shadow-xl border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-100">
              <div>
                <h2 className="m-0 md:text-2xl text-lg font-bold text-gray-800 tracking-tight">
                  Keyboard Shortcuts
                </h2>
                <p className="mt-1 mb-0 md:text-sm text-xs text-gray-500 font-normal">
                  Master your workflow with these shortcuts
                </p>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="border-none bg-gray-100 rounded-xl p-2 md:p-3 cursor-pointer text-gray-500 text-base md:text-lg transition-all flex items-center justify-center min-w-[36px] md:min-w-[44px] min-h-[36px] md:min-h-[44px] hover:bg-green-500 hover:text-white hover:scale-105"
              >
                <MdClose size={20} className="md:w-6 md:h-6 w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-8">
              {/* Navigation Section - Hidden on mobile */}
              <div className={window.innerWidth <= 768 ? "hidden" : "block"}>
                <h3 className="m-0 mb-4 text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-br from-blue-500 to-blue-300 rounded-sm"></span>
                  Navigation
                </h3>
                <div className="md:text-base text-sm text-gray-500 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span>Navigate dates</span>
                    <div className="flex gap-1">
                      <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                        ←
                      </kbd>
                      <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                        →
                      </kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Go to today</span>
                    <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                      T
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Switch views</span>
                    <div className="flex gap-1">
                      <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                        D
                      </kbd>
                      <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                        W
                      </kbd>
                      <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm font-sans">
                        M
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className={window.innerWidth <= 768 ? "hidden" : "block"}>
                <h3 className="m-0 mb-4 text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-br from-blue-300 to-blue-500 rounded-sm"></span>
                  Task Management
                </h3>
                <div className="md:text-base text-sm text-gray-500 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-800 mb-1">
                        Drag middle of task
                      </div>
                      <div className="text-sm">Move task dates</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="min-w-2 h-2 rounded-full bg-blue-300 mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-800 mb-1">
                        Drag left edge
                      </div>
                      <div className="text-sm">Change start date</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="min-w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-800 mb-1">
                        Drag right edge
                      </div>
                      <div className="text-sm">Change end date</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="min-w-2 h-2 rounded-full bg-blue-300 mt-2"></div>
                    <div>
                      <div className="font-medium text-gray-800 mb-1">
                        Click task / team member
                      </div>
                      <div className="text-sm">Select/assign tasks</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="m-0 mb-4 text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-br from-blue-500 to-blue-300 rounded-sm"></span>
                  Visual Indicators
                </h3>
                <div className="md:text-base text-sm text-gray-500 grid gap-4">
                  <div className="bg-gradient-to-br from-gray-100 to-white/80 border border-gray-50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-6 h-3 bg-blue-500 rounded-lg flex-shrink-0"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        Rounded corners
                      </div>
                      <div className="text-xs mt-0.5">
                        Task starts/ends in view
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-100 to-white/80 border border-gray-50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-6 h-3 bg-blue-300 rounded-none flex-shrink-0"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        Square corners
                      </div>
                      <div className="text-xs mt-0.5">
                        Task continues beyond view
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="m-0 text-xs text-gray-500 italic">
                Press{" "}
                <kbd className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300 rounded px-1 py-0.5 text-2xs font-semibold not-italic">
                  Esc
                </kbd>{" "}
                to close this dialog
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-gray-500 text-white px-6 py-4 rounded-xl shadow-lg z-1000 flex items-center gap-2 font-medium text-sm animate-slideIn">
          {notificationMessage}
        </div>
      )}

      {/* Global Styles */}
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                html, body, #__next {
                    font-family: "Poppins", Arial, sans-serif !important;
                }
                * {
                    box-sizing: border-box;
                    font-family: inherit;
                }
                h1, h2, h3, h4, h5, h6, .font-heading {
                    font-family: "Outfit", Arial, sans-serif !important;
                }
                body {
                    margin: 0;
                    background: ${colors.light};
                    min-height: 100vh;
                }
                
                button:focus {
                    outline: 2px solid ${colors.primary};
                    outline-offset: 2px;
                }
                
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                
                ::-webkit-scrollbar-track {
                    background: ${colors.light};
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: ${colors.textSecondary}80;
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: ${colors.textSecondary};
                }
            `}</style>
    </div>
  );
};

// Update the client-side only wrapper
const ClientGanttChart = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <GanttChart />;
};

export default ClientGanttChart;
