import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';
import { motion } from 'motion/react';
import { Check, Edit2, GripVertical } from 'lucide-react';
import type { Task } from '../types';
import { getCategoryName } from '../utils/category-mapper';

const ItemTypes = {
  TASK: 'task',
};

interface DraggableTaskProps {
  task: Task;
  index: number;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  getCategoryColor: (category: string) => string;
  settings: any;
  translations: any;
  isPastDate: boolean;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export function DraggableTask({
  task,
  index,
  moveTask,
  onComplete,
  onEdit,
  getCategoryColor,
  settings,
  translations,
  isPastDate,
}: DraggableTaskProps) {
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemTypes.TASK,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!cardRef.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = cardRef.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveTask(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: () => {
      return { id: task.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Conectar drop ao card inteiro para detecção de hover
  drop(cardRef);
  
  // Conectar drag ao CARD INTEIRO (não apenas ao handle)
  drag(cardRef);

  const t = translations;

  return (
    <motion.div
      ref={cardRef}
      data-handler-id={handlerId}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ 
        opacity: isDragging ? 0.4 : 1, 
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        layout: { duration: 0.2 },
        opacity: { duration: 0.15 },
      }}
      className="bg-white dark:bg-[#151515] rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A] p-3 hover:border-[#8B7355] dark:hover:border-[#8B7355] transition-colors duration-200 cursor-grab active:cursor-grabbing select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none', // Previne callout no iOS
      }}
    >
      <div className="flex items-center gap-1.5">
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-4 h-4 text-[#6B6B6B] dark:text-[#A0A0A0]" />
        </div>

        {/* Category Indicator */}
        {task.category && (
          <div
            className={`w-1 h-6 rounded-full flex-shrink-0 ${getCategoryColor(task.category)}`}
          />
        )}

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F5F5] leading-snug break-words">
            {task.text}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.category && (
              <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0] font-medium">
                {getCategoryName(task.category, settings.language)}
              </span>
            )}
            {task.duration_min && (
              <>
                <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">•</span>
                <span className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
                  {task.duration_min >= 60
                    ? `${(task.duration_min / 60).toFixed(1)}h`
                    : `${task.duration_min}min`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions - SEMPRE VISÍVEIS */}
        {!isPastDate && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('🔧 Edit button clicked!', task.id);
                onEdit(task);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#8B7355]/10 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-[#8B7355]" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('✅ Complete button clicked!', task.id);
                onComplete(task);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
            >
              <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}