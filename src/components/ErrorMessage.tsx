interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div class="error-message" role="alert">
      <p>{message}</p>
    </div>
  );
}
