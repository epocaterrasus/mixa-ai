package storage

import (
	"os"
	"path/filepath"
	"testing"
)

func testKey() []byte {
	return []byte("01234567890123456789012345678901") // 32 bytes
}

func tempDB(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	return filepath.Join(dir, "test.db")
}

func TestOpenAndClose(t *testing.T) {
	store, err := Open(tempDB(t), testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestBadKeyLength(t *testing.T) {
	_, err := Open(tempDB(t), []byte("short"))
	if err == nil {
		t.Fatal("expected error for short key")
	}
}

func TestPutGetRoundTrip(t *testing.T) {
	store, err := Open(tempDB(t), testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	if err := store.Put("secret", []byte("my-value")); err != nil {
		t.Fatalf("Put: %v", err)
	}

	val, err := store.Get("secret")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if string(val) != "my-value" {
		t.Fatalf("expected 'my-value', got %q", string(val))
	}
}

func TestGetMissingKey(t *testing.T) {
	store, err := Open(tempDB(t), testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	val, err := store.Get("nonexistent")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if val != nil {
		t.Fatalf("expected nil for missing key, got %v", val)
	}
}

func TestPutOverwrite(t *testing.T) {
	store, err := Open(tempDB(t), testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	if err := store.Put("key", []byte("v1")); err != nil {
		t.Fatalf("Put v1: %v", err)
	}
	if err := store.Put("key", []byte("v2")); err != nil {
		t.Fatalf("Put v2: %v", err)
	}

	val, err := store.Get("key")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if string(val) != "v2" {
		t.Fatalf("expected 'v2', got %q", string(val))
	}
}

func TestDelete(t *testing.T) {
	store, err := Open(tempDB(t), testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	if err := store.Put("to-delete", []byte("data")); err != nil {
		t.Fatalf("Put: %v", err)
	}
	if err := store.Delete("to-delete"); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	val, err := store.Get("to-delete")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if val != nil {
		t.Fatalf("expected nil after delete, got %v", val)
	}
}

func TestWrongKeyCannotDecrypt(t *testing.T) {
	dbPath := tempDB(t)

	store1, err := Open(dbPath, testKey())
	if err != nil {
		t.Fatalf("Open store1: %v", err)
	}
	if err := store1.Put("encrypted", []byte("secret-data")); err != nil {
		t.Fatalf("Put: %v", err)
	}
	store1.Close()

	wrongKey := []byte("99999999999999999999999999999999")
	store2, err := Open(dbPath, wrongKey)
	if err != nil {
		t.Fatalf("Open store2: %v", err)
	}
	defer store2.Close()

	_, err = store2.Get("encrypted")
	if err == nil {
		t.Fatal("expected decryption error with wrong key")
	}
}

func TestCreatesDirIfMissing(t *testing.T) {
	dir := t.TempDir()
	nested := filepath.Join(dir, "a", "b", "c", "test.db")

	store, err := Open(nested, testKey())
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer store.Close()

	if _, err := os.Stat(filepath.Dir(nested)); os.IsNotExist(err) {
		t.Fatal("expected directory to be created")
	}
}
