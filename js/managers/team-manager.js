#settings-section {
  max-width: 440px;
  margin: 0 auto;
}
#settings-form {
  background: rgba(255,255,255,0.42);
  border-radius: 1.2rem;
  box-shadow: 0 2px 16px #667eea0e;
  padding: 2.3rem 1.5rem 1.1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.settings-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
}
.settings-field label {
  flex: 1 1 0;
}
.settings-field select,
.settings-field input[type="checkbox"] {
  flex: 1 1 0;
  min-width: 40px;
}
