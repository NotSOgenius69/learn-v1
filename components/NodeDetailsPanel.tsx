// components/NodeDetailsPanel.tsx
"use client";

import React, { useState, useEffect } from "react";
import { RoadmapNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Info, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NodeDetailsPanelProps {
  node: RoadmapNode;
  onClose: () => void;
  onUpdate: (node: RoadmapNode) => void;
  isMobile?: boolean;
}

const NodeContent: React.FC<NodeDetailsPanelProps> = ({
  node,
  onClose,
  onUpdate,
}) => {
  const [editableNode, setEditableNode] = useState<RoadmapNode>(node);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditableNode(node);
  }, [node]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditableNode((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onUpdate(editableNode);
    setIsEditing(false);
  };

  const calculateProgress = () => {
    if (!editableNode.timeNeeded) return 0;
    return Math.min(
      100,
      Math.round((editableNode.timeConsumed || 0) / editableNode.timeNeeded * 100)
    );
  };

  const handleCompletedChange = (checked: boolean) => {
    onUpdate({
      ...editableNode,
      completed: checked,
      completionTime: checked ? new Date().toISOString() : undefined,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Title</Label>
              <Input
                id="title"
                name="title"
                value={editableNode.title}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={Array.isArray(editableNode.description) 
                  ? editableNode.description.join('\n') 
                  : editableNode.description || ''}
                onChange={(e) => {
                  setEditableNode(prev => ({
                    ...prev,
                    description: e.target.value.split('\n')
                  }));
                }}
                className="min-h-[100px] bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="timeNeeded" className="text-white">Time Needed (hours)</Label>
              <Input
                id="timeNeeded"
                name="timeNeeded"
                type="number"
                value={editableNode.timeNeeded || 0}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="timeConsumed" className="text-white">Time Consumed (hours)</Label>
              <Input
                id="timeConsumed"
                name="timeConsumed"
                type="number"
                value={editableNode.timeConsumed || 0}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="text-white">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                value={editableNode.deadline || ""}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-white/10 text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="completed"
                checked={editableNode.completed || false}
                onCheckedChange={handleCompletedChange}
              />
              <Label htmlFor="completed" className="text-white">Completed</Label>
            </div>

            {editableNode.completed && editableNode.completionTime && (
              <div className="text-sm text-gray-400">
                Completed on: {new Date(editableNode.completionTime).toLocaleDateString()}
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{editableNode.title}</h2>
              <div className="space-y-2">
                <h3 className="font-medium">Description</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {Array.isArray(editableNode.description) 
                    ? editableNode.description.map((desc, index) => (
                        <li key={index} className="text-sm">{desc}</li>
                      ))
                    : <li className="text-sm">{editableNode.description}</li>
                  }
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Progress</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
              <p className="text-sm mt-1">
                {editableNode.timeConsumed || 0} / {editableNode.timeNeeded || 0} hours
              </p>
            </div>

            {editableNode.deadline && (
              <div>
                <h3 className="font-medium">Deadline</h3>
                <p className="text-sm">
                  {format(new Date(editableNode.deadline), 'PPP')}
                </p>
              </div>
            )}

            <Button onClick={() => setIsEditing(true)} className="w-full">
              Edit Node
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node,
  onClose,
  onUpdate,
  isMobile = false,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onUpdate({
      ...node,
      [name]: value,
    });
  };

  const handleCompletedChange = (checked: boolean) => {
    onUpdate({
      ...node,
      completed: checked,
      completionTime: checked ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className={cn(
      "flex flex-col h-full",
      !isMobile && "w-96"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Node Details</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-white">Title</Label>
          <Input
            id="title"
            name="title"
            value={node.title}
            onChange={handleInputChange}
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-white">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={node.description || ""}
            onChange={handleInputChange}
            className="min-h-[100px] bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeNeeded" className="text-white">Time Needed (hours)</Label>
          <Input
            id="timeNeeded"
            name="timeNeeded"
            type="number"
            value={node.timeNeeded || ""}
            onChange={handleInputChange}
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeConsumed" className="text-white">Time Consumed (hours)</Label>
          <Input
            id="timeConsumed"
            name="timeConsumed"
            type="number"
            value={node.timeConsumed || ""}
            onChange={handleInputChange}
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline" className="text-white">Deadline</Label>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            value={node.deadline || ""}
            onChange={handleInputChange}
            className="bg-[#1a1a1a] border-white/10 text-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="completed"
            checked={node.completed || false}
            onCheckedChange={handleCompletedChange}
          />
          <Label htmlFor="completed" className="text-white">Completed</Label>
        </div>

        {node.completed && node.completionTime && (
          <div className="text-sm text-gray-400">
            Completed on: {new Date(node.completionTime).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailsPanel;
