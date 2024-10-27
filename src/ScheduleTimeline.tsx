import React, { useState, useEffect } from "react";
import TimelineDisplay from "./TimelineDisplay";

interface TimeBlockData {
  id: string;
  start: number;
  end: number;
  label: string;
  color: string;
  calendarId: string;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
}

const defaultCalendars: Calendar[] = [
  {
    id: "work",
    name: "Work Schedule",
    color: "#E6F3FF",
  },
  {
    id: "personal",
    name: "Personal",
    color: "#F3E6FF",
  }
];

const defaultBlocks: TimeBlockData[] = [
  {
    id: "work-block",
    start: 9,
    end: 17,
    label: "Work Hours",
    color: "#E6F3FF",
    calendarId: "work",
  },
  {
    id: "sleep",
    start: 23,
    end: 7,
    label: "Sleep",
    color: "#F3E6FF",
    calendarId: "personal",
  }
];

const ScheduleManager: React.FC = () => {
  // Load data from localStorage or use defaults
  const [calendars, setCalendars] = useState<Calendar[]>(() => {
    const saved = localStorage.getItem('calendars');
    return saved ? JSON.parse(saved) : defaultCalendars;
  });

  const [blocks, setBlocks] = useState<TimeBlockData[]>(() => {
    const saved = localStorage.getItem('blocks');
    return saved ? JSON.parse(saved) : defaultBlocks;
  });

  const [newCalendarName, setNewCalendarName] = useState("");

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('calendars', JSON.stringify(calendars));
  }, [calendars]);

  useEffect(() => {
    localStorage.setItem('blocks', JSON.stringify(blocks));
  }, [blocks]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex items-center gap-4">
        <input 
          type="text" 
          value={newCalendarName} 
          onChange={(e) => setNewCalendarName(e.target.value)} 
          placeholder="New Calendar Name" 
          className="border p-2 rounded" 
        />
        <button
          onClick={() => {
            if (newCalendarName.trim()) {
              const newCalendar: Calendar = {
                id: `calendar-${Date.now()}`,
                name: newCalendarName,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
              };
              setCalendars((prev) => [...prev, newCalendar]);
              setNewCalendarName("");
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Calendar
        </button>
      </div>

      {calendars.map((calendar, idx) => (
        <div key={calendar.id} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{calendar.name}</h2>
            <div className="flex items-center gap-4">
              {idx > 0 && (
                <button
                  onClick={() => {
                    setCalendars((prev) => prev.filter((cal) => cal.id !== calendar.id));
                    setBlocks((prev) => prev.filter((block) => block.calendarId !== calendar.id));
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete Calendar
                </button>
              )}
            </div>
          </div>
          <TimelineDisplay
            blocks={blocks.filter((block) => block.calendarId === calendar.id)}
            calendarId={calendar.id}
            onAddBlock={(block) => setBlocks((prev) => [...prev, block])}
            onUpdateBlock={(id, updates) => {
              setBlocks((prev) => 
                prev.map((block) => 
                  block.id === id ? { ...block, ...updates } : block
                )
              );
            }}
            onDeleteBlock={(id) => {
              setBlocks((prev) => prev.filter((block) => block.id !== id));
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ScheduleManager;