import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatSchoolYear } from "../utils/schoolYear";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  classIds: [],
  subjectIds: [],
};

function formFromUser(user, userType) {
  if (!user) return EMPTY_FORM;
  return {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    classIds: (user.userClasses || []).map((item) => String(item.class.id)),
    subjectIds: userType === "teacher"
      ? (user.userSubjects || []).map((item) => String(item.subject.id))
      : [],
  };
}

function CheckboxMultiSelect({ label, options, selectedIds, onChange, formatOption, emptyText, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function updateDropdownPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const maxHeight = 192;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const opensUp = spaceBelow < maxHeight && spaceAbove > spaceBelow;
      setDropdownStyle({
        left: rect.left,
        width: rect.width,
        top: opensUp
          ? Math.max(8, rect.top - Math.min(maxHeight, spaceAbove) - gap)
          : rect.bottom + gap,
        maxHeight: Math.max(96, Math.min(maxHeight, opensUp ? spaceAbove : spaceBelow)),
      });
    }

    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    updateDropdownPosition();
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen]);

  function toggle(optionId) {
    const id = String(optionId);
    onChange(selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id]);
  }

  const selectedOptions = options.filter((option) => selectedIds.includes(String(option.id)));
  const visibleSelected = selectedOptions.slice(0, 2);
  const additionalCount = selectedOptions.length - visibleSelected.length;

  return (
    <fieldset className="admin-multi-select" ref={containerRef}>
      <legend>{label}</legend>
      <button
        type="button"
        className="admin-multi-select-trigger"
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        disabled={options.length === 0}
      >
        <span className="admin-multi-select-values">
          {visibleSelected.length === 0 && <span className="admin-multi-select-placeholder">{options.length === 0 ? emptyText : placeholder}</span>}
          {visibleSelected.map((option) => (
            <span className="admin-multi-select-chip" key={option.id}>{formatOption(option)}</span>
          ))}
          {additionalCount > 0 && <span className="admin-multi-select-more">+{additionalCount} weitere</span>}
        </span>
        <span className="admin-multi-select-chevron" aria-hidden="true">{isOpen ? "▴" : "▾"}</span>
      </button>
      {isOpen && options.length > 0 && dropdownStyle && createPortal(
        <div
          ref={dropdownRef}
          className="admin-multi-select-dropdown"
          role="listbox"
          aria-label={label}
          style={dropdownStyle}
        >
          {options.map((option) => (
            <label key={option.id} className="admin-multi-select-option">
              <input
                type="checkbox"
                value={option.id}
                checked={selectedIds.includes(String(option.id))}
                onChange={() => toggle(option.id)}
              />
              <span>{formatOption(option)}</span>
            </label>
          ))}
        </div>,
        document.body,
      )}
    </fieldset>
  );
}

export default function AdminUserModal({
  open,
  userType,
  user,
  classes,
  subjects,
  busy,
  error,
  t,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(formFromUser(user, userType));
  }, [open, user, userType]);

  if (!open) return null;

  const isStudent = userType === "student";
  const isEditing = Boolean(user);
  const roleLabel = isStudent ? t.roleStudentSingular : t.roleTeacherSingular;

  function submit(event) {
    event.preventDefault();
    onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      classIds: form.classIds.map(Number),
      ...(isStudent ? {} : { subjectIds: form.subjectIds.map(Number) }),
    });
  }

  return (
    <div className="admin-user-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div className="admin-user-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-modal-title">
        <div className="admin-user-modal-header">
          <h3 id="admin-user-modal-title">
            {isEditing ? t.editUserTitle : t.addUserTitle}: {roleLabel}
          </h3>
          <button type="button" className="admin-modal-close" onClick={onClose} disabled={busy} aria-label={t.close}>
            ×
          </button>
        </div>

        <form className="admin-user-form" onSubmit={submit}>
          <label>
            <span>{t.firstName}</span>
            <input
              type="text"
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              maxLength={255}
              required
            />
          </label>
          <label>
            <span>{t.lastName}</span>
            <input
              type="text"
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              maxLength={255}
              required
            />
          </label>
          <label>
            <span>{t.emailAddress}</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              maxLength={255}
              required
            />
          </label>

          <CheckboxMultiSelect
            label={isStudent ? t.classLbl : t.classesLabel}
            options={classes}
            selectedIds={form.classIds}
            onChange={(classIds) => setForm((current) => ({ ...current, classIds }))}
            formatOption={(item) => `${item.name} (${formatSchoolYear(item.year)})`}
            emptyText={t.noClassesAvailable}
            placeholder={t.selectValues}
          />

          {!isStudent && (
            <CheckboxMultiSelect
              label={t.subjectsLabel}
              options={subjects}
              selectedIds={form.subjectIds}
              onChange={(subjectIds) => setForm((current) => ({ ...current, subjectIds }))}
              formatOption={(item) => `${item.name} (${item.code})`}
              emptyText={t.noSubjectsAvailable}
              placeholder={t.selectValues}
            />
          )}

          <p className="admin-password-note">{t.initialPasswordNote}</p>
          {error ? <div className="admin-form-error" role="alert">{error}</div> : null}

          <div className="admin-user-modal-actions">
            <button type="button" className="admin-btn-secondary" onClick={onClose} disabled={busy}>
              {t.cancel}
            </button>
            <button type="submit" className="admin-btn-primary" disabled={busy}>
              {busy ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
