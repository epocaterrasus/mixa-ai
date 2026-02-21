// Package storage provides an encrypted SQLite wrapper using AES-256-GCM.
// It encrypts data at the application layer before writing to SQLite.
package storage

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Store wraps a SQLite database with AES-256-GCM encryption for values.
type Store struct {
	db     *sql.DB
	gcm    cipher.AEAD
	dbPath string
}

// Open creates or opens an encrypted SQLite store at the given path.
// The key must be exactly 32 bytes (256 bits) for AES-256.
func Open(dbPath string, key []byte) (*Store, error) {
	if len(key) != 32 {
		return nil, errors.New("encryption key must be exactly 32 bytes")
	}

	// Ensure parent directory exists.
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("create storage directory: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create GCM: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Create key-value table if it doesn't exist.
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS kv (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	)`); err != nil {
		db.Close()
		return nil, fmt.Errorf("create kv table: %w", err)
	}

	return &Store{db: db, gcm: gcm, dbPath: dbPath}, nil
}

// Put stores a value encrypted under the given key.
func (s *Store) Put(key string, plaintext []byte) error {
	nonce := make([]byte, s.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return fmt.Errorf("generate nonce: %w", err)
	}
	ciphertext := s.gcm.Seal(nonce, nonce, plaintext, nil)
	encoded := hex.EncodeToString(ciphertext)

	_, err := s.db.Exec(
		`INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, encoded,
	)
	return err
}

// Get retrieves and decrypts the value for the given key.
// Returns nil, nil if the key does not exist.
func (s *Store) Get(key string) ([]byte, error) {
	var encoded string
	err := s.db.QueryRow(`SELECT value FROM kv WHERE key = ?`, key).Scan(&encoded)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	ciphertext, err := hex.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode hex: %w", err)
	}

	nonceSize := s.gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := s.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decrypt: %w", err)
	}
	return plaintext, nil
}

// Delete removes a key from the store.
func (s *Store) Delete(key string) error {
	_, err := s.db.Exec(`DELETE FROM kv WHERE key = ?`, key)
	return err
}

// Close closes the underlying SQLite database.
func (s *Store) Close() error {
	return s.db.Close()
}
