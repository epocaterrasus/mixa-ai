// @mixa-ai/terminal-renderer — Form component
// Renders dynamic forms from field definitions with validation on submit

import { useCallback, useState } from "react";
import type { FormField, UIComponent, UIEvent } from "@mixa-ai/types";
import { buttonAccent, token, spacing, typography, radii } from "../styles.js";

export interface FormProps {
  component: UIComponent;
  onEvent?: (event: UIEvent) => void;
  module: string;
}

const formStyle: React.CSSProperties = {
  backgroundColor: token("bgSurface"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.lg,
  padding: spacing[4],
  marginBottom: spacing[3],
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: spacing[3],
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium,
  color: token("textSecondary"),
  marginBottom: spacing[1],
  fontFamily: typography.fontFamily.sans,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing[2]} ${spacing[3]}`,
  backgroundColor: token("bgElevated"),
  border: `1px solid ${token("borderDefault")}`,
  borderRadius: radii.md,
  color: token("textPrimary"),
  fontSize: typography.fontSize.base,
  fontFamily: typography.fontFamily.sans,
  outline: "none",
  boxSizing: "border-box",
};

const inputFocusStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: token("borderFocus"),
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: spacing[8],
};

const checkboxContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[2],
};

const errorStyle: React.CSSProperties = {
  fontSize: typography.fontSize.xs,
  color: "#ef4444",
  marginTop: spacing[1],
  fontFamily: typography.fontFamily.sans,
};

const requiredStyle: React.CSSProperties = {
  color: "#ef4444",
  marginLeft: spacing[1],
};

function FormFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}): React.JSX.Element {
  const [focused, setFocused] = useState(false);

  const currentInputStyle = focused ? inputFocusStyle : inputStyle;

  switch (field.fieldType) {
    case "select":
      return (
        <div style={fieldGroupStyle}>
          <label htmlFor={field.id} style={labelStyle}>
            {field.label}
            {field.required && <span style={requiredStyle}>*</span>}
          </label>
          <select
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={focused ? { ...selectStyle, borderColor: token("borderFocus") } : selectStyle}
          >
            <option value="">{field.placeholder ?? "Select..."}</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div style={fieldGroupStyle}>
          <div style={checkboxContainerStyle}>
            <input
              type="checkbox"
              id={field.id}
              checked={value === "true"}
              onChange={(e) => onChange(String(e.target.checked))}
            />
            <label htmlFor={field.id} style={{ ...labelStyle, margin: 0 }}>
              {field.label}
              {field.required && <span style={requiredStyle}>*</span>}
            </label>
          </div>
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      );

    case "password":
      return (
        <div style={fieldGroupStyle}>
          <label htmlFor={field.id} style={labelStyle}>
            {field.label}
            {field.required && <span style={requiredStyle}>*</span>}
          </label>
          <input
            type="password"
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder ?? ""}
            style={currentInputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      );

    case "number":
      return (
        <div style={fieldGroupStyle}>
          <label htmlFor={field.id} style={labelStyle}>
            {field.label}
            {field.required && <span style={requiredStyle}>*</span>}
          </label>
          <input
            type="number"
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder ?? ""}
            style={currentInputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      );

    default: // text
      return (
        <div style={fieldGroupStyle}>
          <label htmlFor={field.id} style={labelStyle}>
            {field.label}
            {field.required && <span style={requiredStyle}>*</span>}
          </label>
          <input
            type="text"
            id={field.id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={field.placeholder ?? ""}
            style={currentInputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
        </div>
      );
  }
}

export function Form({ component, onEvent, module }: FormProps): React.JSX.Element {
  const fields = component.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.id] = field.fieldType === "checkbox" ? "false" : "";
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate required fields
      const newErrors: Record<string, string> = {};
      for (const field of fields) {
        const val = values[field.id] ?? "";
        if (field.required && (!val || val === "false")) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      onEvent?.({
        module,
        actionId: null,
        componentId: component.id,
        eventType: "input",
        data: values,
      });
    },
    [fields, values, onEvent, module, component.id],
  );

  return (
    <form id={component.id} style={formStyle} onSubmit={handleSubmit}>
      {fields.map((field) => (
        <FormFieldInput
          key={field.id}
          field={field}
          value={values[field.id] ?? ""}
          onChange={(val) => handleChange(field.id, val)}
          error={errors[field.id] ?? null}
        />
      ))}
      <button type="submit" style={buttonAccent}>
        Submit
      </button>
    </form>
  );
}
