import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const TimePickerModal = ({ isOpen, onClose, block, onUpdateTime }: { isOpen: boolean; onClose: () => void; block: { id: string; start: number; end: number; label: string } | null; onUpdateTime: (id: string, start: number, end: number) => void }) => {
  const [startHour, setStartHour] = React.useState(0);
  const [startMinute, setStartMinute] = React.useState(0);
  const [endHour, setEndHour] = React.useState(0);
  const [endMinute, setEndMinute] = React.useState(0);

  React.useEffect(() => {
    if (block) {
      const start = block.start;
      const end = block.end;

      setStartHour(Math.floor(start));
      setStartMinute(Math.round((start % 1) * 60));
      setEndHour(Math.floor(end));
      setEndMinute(Math.round((end % 1) * 60));
    }
  }, [block]);

  const handleSave = () => {
    if (block) {
      const newStart = startHour + startMinute / 60;
      const newEnd = endHour + endMinute / 60;

      onUpdateTime(block.id, newStart, newEnd);
      onClose();
    }
  };

  const TimeInput = ({ value, onChange, max, label }: { value: number; onChange: (val: number) => void; max: number; label: string }) => (
    <div className="flex flex-col items-center gap-2">
      <label className="text-sm text-gray-500">{label}</label>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => onChange(value === 0 ? max : value - 1)}>
          -
        </button>
        <input
          type="number"
          value={value.toString().padStart(2, "0")}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 0 && val <= max) {
              onChange(val);
            }
          }}
          className="w-12 text-center border rounded p-1"
          min={0}
          max={max}
        />
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => onChange(value === max ? 0 : value + 1)}>
          +
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Edit Time: {block?.label}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="space-y-8">
            {/* Start Time */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Start Time</h3>
              <div className="flex items-center justify-center gap-8">
                <TimeInput value={startHour} onChange={setStartHour} max={23} label="Hours" />
                <div className="text-2xl font-light text-gray-400">:</div>
                <TimeInput value={startMinute} onChange={setStartMinute} max={59} label="Minutes" />
              </div>
            </div>

            {/* End Time */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">End Time</h3>
              <div className="flex items-center justify-center gap-8">
                <TimeInput value={endHour} onChange={setEndHour} max={23} label="Hours" />
                <div className="text-2xl font-light text-gray-400">:</div>
                <TimeInput value={endMinute} onChange={setEndMinute} max={59} label="Minutes" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimePickerModal;
