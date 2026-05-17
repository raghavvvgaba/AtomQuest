"use client";

import { Minus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { THRUST_AREA_VALUES } from "@/lib/types";
import type { Goal, GoalFieldError } from "@/lib/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

export function GoalRowEditor({
  goal,
  index,
  readOnly,
  errors,
  onFieldChange,
  onRemove,
  allowRemove,
}: {
  goal: Goal;
  index: number;
  readOnly: boolean;
  errors?: GoalFieldError;
  onFieldChange: <K extends keyof Goal>(goalId: string, field: K, value: Goal[K]) => void;
  onRemove: (goalId: string) => void;
  allowRemove: boolean;
}) {
  const showDirectionSelect = goal.uomType === "numeric" || goal.uomType === "percentage";
  const showTargetField = goal.uomType !== "zero";

  return (
    <div className="rounded-[30px] border border-border bg-card p-5 shadow-[0_16px_35px_rgba(31,32,27,0.05)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Goal row</p>
            <p className="text-lg font-semibold">Define one measurable goal</p>
          </div>
        </div>

        {allowRemove ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(goal.id)}
            type="button"
          >
            <Minus className="mr-2 size-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Thrust area</Label>
          <Select
            disabled={readOnly}
            onValueChange={(value) =>
              onFieldChange(goal.id, "thrustArea", value as Goal["thrustArea"])
            }
            value={goal.thrustArea || ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select thrust area" />
            </SelectTrigger>
            <SelectContent>
              {THRUST_AREA_VALUES.map((thrustArea) => (
                <SelectItem key={thrustArea} value={thrustArea}>
                  {thrustArea}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors?.thrustArea} />
        </div>

        <div className="space-y-2">
          <Label>Goal title</Label>
          <Input
            disabled={readOnly}
            value={goal.title}
            onChange={(event) => onFieldChange(goal.id, "title", event.target.value)}
          />
          <FieldError message={errors?.title} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label>Goal description</Label>
        <Textarea
          disabled={readOnly}
          value={goal.description}
          onChange={(event) => onFieldChange(goal.id, "description", event.target.value)}
        />
        <FieldError message={errors?.description} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>UoM type</Label>
          <Select
            disabled={readOnly}
            onValueChange={(value) =>
              onFieldChange(goal.id, "uomType", value as Goal["uomType"])
            }
            value={goal.uomType || ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="numeric">Numeric</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="zero">Zero-based</SelectItem>
            </SelectContent>
          </Select>
          <FieldError message={errors?.uomType} />
        </div>

        <div className="space-y-2">
          <Label>Direction</Label>
          {showDirectionSelect ? (
            <Select
              disabled={readOnly}
              onValueChange={(value) =>
                onFieldChange(goal.id, "uomDirection", value as Goal["uomDirection"])
              }
              value={goal.uomDirection || ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="min">Higher is better</SelectItem>
                <SelectItem value="max">Lower is better</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              disabled
              value={
                goal.uomType === "timeline"
                  ? "Date-based completion"
                  : goal.uomType === "zero"
                    ? "Zero is success"
                    : "Choose a UoM type first"
              }
            />
          )}
          <FieldError message={errors?.uomDirection} />
        </div>

        <div className="space-y-2">
          <Label>Target value</Label>
          {showTargetField ? (
            <Input
              disabled={readOnly}
              type={goal.uomType === "timeline" ? "date" : "number"}
              value={goal.targetValue}
              onChange={(event) => onFieldChange(goal.id, "targetValue", event.target.value)}
            />
          ) : (
            <Input disabled value="0" />
          )}
          <FieldError message={errors?.targetValue} />
        </div>

        <div className="space-y-2">
          <Label>Weightage (%)</Label>
          <Input
            disabled={readOnly}
            min={0}
            max={100}
            type="number"
            value={goal.weightage ?? ""}
            onChange={(event) =>
              onFieldChange(
                goal.id,
                "weightage",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          />
          <FieldError message={errors?.weightage} />
        </div>
      </div>

    </div>
  );
}
