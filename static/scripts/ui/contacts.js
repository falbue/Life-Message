document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'chats';

    const cardList = document.querySelector('.card-list');
    let editChatId = null;

    function getChats() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }

    function saveChats(chats) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }

    function createId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function createCardElement(chat) {
        const link = document.createElement('a');
        link.className = 'card w100 space-between';
        link.href = `chat/${chat.link}`;
        link.dataset.chatId = chat.id;

        const main = document.createElement('main');
        main.className = 'between';

        const left = document.createElement('nav');
        left.className = 'column';

        const name = document.createElement('nav');
        name.className = 'align-center';

        const title = document.createElement('h4');
        title.className = 'accent';
        title.textContent = chat.title;

        const linkElement = document.createElement('h5');
        linkElement.className = 'inline';
        linkElement.textContent = chat.link;


        const users = document.createElement('h5');
        users.textContent = chat.users.length ? chat.users.join(', ') : '';


        name.append(title, linkElement);
        left.append(name, users);


        const right = document.createElement('nav');
        right.className = 'column';

        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = chat.date;

        const actions = document.createElement('nav');

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'iconoir-edit';
        editButton.setAttribute('menu', 'edit-contact');
        editButton.setAttribute('menu', 'edit-chat');

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'red iconoir-trash';
        deleteButton.setAttribute('menu', 'delete-chat');

        actions.append(editButton, deleteButton);
        right.append(chip, actions);
        main.append(left, right);
        link.appendChild(main);

        return link;
    }

    function renderCards() {
        const addButton = cardList.querySelector('.card.w100:not([href])');
        const chats = getChats();

        cardList.innerHTML = '';
        if (addButton) cardList.appendChild(addButton);

        chats.forEach((chat) => {
            cardList.appendChild(createCardElement(chat));
        });
    }

    function getEditChatContainer() {
        return document.getElementById('editUsersContainer');
    }

    function addEditUserInput(value = '') {
        const editUsersContainer = getEditChatContainer();
        if (!editUsersContainer) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'user-input';
        input.placeholder = 'Имя пользователя';
        input.value = value;
        editUsersContainer.appendChild(input);
    }

    function fillEditChatForm(chat) {
        const titleInput = document.getElementById('editChatTitle');
        const linkInput = document.getElementById('editChatLink');
        const editUsersContainer = getEditChatContainer();

        if (!titleInput || !linkInput || !editUsersContainer) {
            return false;
        }

        titleInput.value = chat.title;
        linkInput.value = chat.link;
        editUsersContainer.innerHTML = '';

        chat.users.forEach((user) => addEditUserInput(user));

        if (chat.users.length === 0) {
            addEditUserInput();
        }

        return true;
    }

    document.addEventListener('click', (e) => {
        if (e.target.id !== 'addUserBtn' && !e.target.closest('#addUserBtn')) return;

        const usersContainer = document.getElementById('usersContainer');
        if (!usersContainer) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'user-input';
        input.placeholder = 'Имя пользователя';
        usersContainer.appendChild(input);
        input.focus();
    });

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'chatForm') {
            e.preventDefault();

            const usersContainer = document.getElementById('usersContainer');
            const chatForm = e.target;

            const title = document.getElementById('chatTitle').value.trim();
            const link = document.getElementById('chatLink').value.trim();
            const users = Array.from(usersContainer.querySelectorAll('.user-input'))
                .map(input => input.value.trim())
                .filter(Boolean);

            const chats = getChats();
            chats.push({
                id: createId(),
                title,
                link,
                users,
                date: new Date().toLocaleDateString('ru-RU')
            });

            saveChats(chats);
            chatForm.reset();
            usersContainer.innerHTML = '';
            renderCards();
            return;
        }

        if (e.target.id !== 'editChatForm') return;

        e.preventDefault();

        const editUsersContainer = getEditChatContainer();

        const title = document.getElementById('editChatTitle').value.trim();
        const link = document.getElementById('editChatLink').value.trim();
        const users = Array.from(editUsersContainer.querySelectorAll('.user-input'))
            .map(input => input.value.trim())
            .filter(Boolean);

        const chats = getChats();
        const chatIndex = chats.findIndex((chat) => chat.id === editChatId);

        if (chatIndex === -1) return;

        chats[chatIndex] = {
            ...chats[chatIndex],
            title,
            link,
            users
        };

        saveChats(chats);
        e.target.reset();
        editUsersContainer.innerHTML = '';
        editChatId = null;
        renderCards();
    });

    document.addEventListener('click', (e) => {
        if (e.target.id !== 'editAddUserBtn' && !e.target.closest('#editAddUserBtn')) return;

        addEditUserInput();
    });

    renderCards();
});