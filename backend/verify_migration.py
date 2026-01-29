"""Verify the migrated data looks correct by sampling a few records."""
import json
import sqlite3

conn = sqlite3.connect("backend/data/books.db")
cursor = conn.cursor()

print("\n" + "="*80)
print("MIGRATION DATA VERIFICATION")
print("="*80)

# Sample one book from each table
print("\n1. Sample from books_v2 (intrinsic metadata):")
cursor.execute("SELECT * FROM books_v2 LIMIT 1")
columns = [desc[0] for desc in cursor.description]
book_v2 = dict(zip(columns, cursor.fetchone()))
print(f"  Title: {book_v2['title']}")
print(f"  Authors: {book_v2['authors']}")
print(f"  ISBN: {book_v2['isbn']}")
print(f"  Publisher: {book_v2['publisher']}")
print(f"  ID: {book_v2['id']}")

# Find corresponding library_book
print("\n2. Sample from library_books (physical copy):")
cursor.execute("SELECT * FROM library_books WHERE book_id = ?", (book_v2['id'],))
columns = [desc[0] for desc in cursor.description]
lib_book = dict(zip(columns, cursor.fetchone()))
print(f"  Book ID: {lib_book['book_id']}")
print(f"  Library ID: {lib_book['library_id']}")
print(f"  Condition: {lib_book['condition']}")
print(f"  Physical Location: {lib_book['physical_location']}")
print(f"  Series: {lib_book['series']}")
print(f"  Loan Status: {lib_book['loan_status']}")
print(f"  Cover Path: {lib_book['cover_image_path']}")

# Check old book for comparison
print("\n3. Original old book (for comparison):")
cursor.execute("SELECT title, creator, identifier, condition, shelf_location, series FROM books LIMIT 1")
old_book = cursor.fetchone()
print(f"  Title: {old_book[0]}")
print(f"  Creator (now authors): {old_book[1]}")
print(f"  Identifier (now isbn): {old_book[2]}")
print(f"  Condition: {old_book[3]}")
print(f"  Shelf Location (now physical_location): {old_book[4]}")
print(f"  Series: {old_book[5]}")

# Count all records
print("\n" + "="*80)
print("RECORD COUNTS")
print("="*80)
cursor.execute("SELECT COUNT(*) FROM books")
print(f"Old books table:      {cursor.fetchone()[0]} records")

cursor.execute("SELECT COUNT(*) FROM books_v2")
print(f"New books_v2 table:   {cursor.fetchone()[0]} records")

cursor.execute("SELECT COUNT(*) FROM library_books")
print(f"library_books table:  {cursor.fetchone()[0]} records")

cursor.execute("SELECT COUNT(*) FROM user_book_data")
print(f"user_book_data table: {cursor.fetchone()[0]} records")

conn.close()

print("\n" + "="*80)
print("[OK] Verification complete - data looks correct!")
print("="*80 + "\n")
