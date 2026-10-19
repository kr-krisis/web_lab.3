import { Command } from 'commander';
import fs from 'node:fs';
const library = new Command();

// Загальна частина
library.configureOutput({
  outputError: (message, write) => {
    process.exitCode = 1;

    let text = message.trim();

    text = text.replace(
      /^error: missing required argument/i,
      'Помилка: пропущено обов’язковий аргумент'
    );

    text = text.replace(
      /^error: unknown option/i,
      'Помилка: невідома опція'
    );

    text = text.replace(
      /^error: unknown command/i,
      'Помилка: невідома команда'
    );

    write(`${text}\n`);
  }
});

function readBooks() {
  try {
    const books = JSON.parse(
      fs.readFileSync('library.json', 'utf8')
    );

    if (!Array.isArray(books)) {
      console.error('Помилка: JSON має містити масив книг.');
      process.exitCode = 1;
      return null;
    }

    return books;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Помилка: файл library.json не знайдено.');
    } else if (error instanceof SyntaxError) {
      console.error('Помилка: некоректний JSON у library.json.');
    } else {
      console.error('Помилка: не вдалося прочитати файл.');
    }

    process.exitCode = 1;
    return null;
  }
}

// Перелік
library
  .command('list')
  .description('Показати перелік книг')
  .option('--limit <number>', 'Кількість книг для відображення')
  .action((options) => {
    const books = readBooks();
    if (books === null) return;
    const limit = Number(options.limit) || books.length;

    books.slice(0, limit).forEach((book) => {
      console.log(`${book.name} - ${book.author}`);
    });
  });


// Один елемент
library
  .command('show <number>')
  .description('Показати одну книгу повністю')
  .action((number) => {
    const books = readBooks();
    if (books === null) return;
    const index = Number(number);

    if (!Number.isInteger(index) || index < 1 || index > books.length) {
      console.error('Помилка: книги з таким номером немає.');
      return;
    }

    console.log(books[index - 1]);
  });

// Одне поле
library
  .command('get <number> <path>')
  .description('Показати окреме поле книги')
  .action((number, path) => {
    const books = readBooks();
    if (books === null) return;
    const index = Number(number);

    if (!Number.isInteger(index) || index < 1 || index > books.length) {
      console.error('Помилка: книги з таким номером немає.');
      return;
    }

    let all_obj = books[index - 1];

    for (const key of path.split('.')) {
      if (all_obj === null || typeof all_obj !== 'object' || !Object.hasOwn(all_obj, key)) {
        console.error('Помилка: такого поля немає.');
        return;
      }

      all_obj = all_obj[key];
    }

    console.log(all_obj);
  });

// Персоналізована частина

//Пошук книги автора
library
  .command('search_book <name>')
  .description('Знайти книги за частиною імені автора')
  .action((name) => {
    if (!name.trim() || /^[0-9]+$/.test(name.trim())) {
      console.error('Помилка: введіть ім’я автора текстом.');
      return;
    }

    const books = readBooks();
    if (books === null) return;
    const found = books.filter(book =>
      book.author.toLowerCase().includes(name.trim().toLowerCase())
    );

    if (found.length === 0) {
      console.error('Помилка: книг цього автора не знайдено.');
      return;
    }

    found.forEach(book => console.log(book.name));
  });

// Пошук доступниї примірників  
library
  .command('valid_book <name>')
  .description('Показати примірники книги')
  .option('-a, --available', 'Показати лише доступні примірники')
  .action((name, options) => {
    const books = readBooks();
    if (books === null) return;
    const book = books.find(
      book => book.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (!book) {
      console.error('Помилка: книгу не знайдено.');
      return;
    }

    let copies = book.amout;

    if (options.available) {
      copies = copies.filter(copy => copy.availability);
    }

    if (copies.length === 0) {
      console.log('Примірників за заданими умовами не знайдено.');
      return;
    }

    copies.forEach(copy => {
      console.log(copy.inventory_number);
    });
  });

// Історія видачі конкретного примірника
library
  .command('history <inventory_number>')
  .description('Показати історію видач конкретного примірника')
  .action((inventory_number) => {
    if (!/^[0-9]+$/.test(inventory_number)) {
      console.error('Помилка: інвентарний номер має містити лише цифри.');
      return;
    }

    const books = readBooks();
    if (books === null) return;

    let foundCopy = null;
    let bookName = '';

    for (const book of books) {
      const copy = book.amout.find(
        copy => copy.inventory_number === Number(inventory_number)
      );
 
      if (copy) {
        foundCopy = copy;
        bookName = book.name.trim();
        break;
      }
    }

    if (!foundCopy) {
      console.error('Помилка: примірник не знайдено.');
      return;
    }

    console.log(bookName);

    if (foundCopy.history.length === 0) {
      console.log('Історія видач відсутня.');
      return;
    }

    foundCopy.history.forEach(record => {
      console.log(
        `${record.reader} ( Видача: ${record.get_date} | Повернення: ${record.return_date ?? 'ще не повернуто'})`
      );
    });
  });

  library.parse(process.argv);