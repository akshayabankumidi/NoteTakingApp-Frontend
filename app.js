$(document).ready(function() {
    const API_URL = 'http://localhost:3000/api';
    let token = localStorage.getItem('token');
    let currentView = 'home';
    let currentFilter = {};
    let currentSearchTerm = '';

    function updateAuthUI() {
            if (token) {
                $('#loginBtn, #registerBtn, #auth-forms').hide();
                $('#logoutBtn, #notes-section, #home-btn, #archived-btn, #trash-btn, #reminder-btn, #search-form, #new-note-btn').show();
    
                fetchNotes();
            } else {
                $('#loginBtn, #registerBtn').show();
                $('#logoutBtn, #notes-section, #home-btn, #archived-btn, #trash-btn, #reminder-btn, #search-form, #new-note-btn').hide();
            }
    }

    $('#loginBtn').click(function() {
        $('#register-form').hide();
        $('#login-form').show();
        $('#auth-forms').show();
        $('#notes-section').hide();
    });

    $('#registerBtn').click(function() {
        $('#login-form').hide();
        $('#register-form').show();
        $('#auth-forms').show();
        $('#notes-section').hide();
    });

    $('#logoutBtn').click(function() {
        localStorage.removeItem('token');
        token = null;
        updateAuthUI();
    });

    $('#login-form').submit(function(e) {
        e.preventDefault();
        const username = $('#login-username').val();
        const password = $('#login-password').val();
        
        $.ajax({
            url: `${API_URL}/users/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, password }),
            success: function(response) {
                token = response.token;
                localStorage.setItem('token', token);
                currentView = 'home';
                updateAuthUI();
            },
            error: function(xhr, status, error) {
                console.error('Login error:', xhr.responseText);
                alert('Login failed: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });

    $('#register-form').submit(function(e) {
        e.preventDefault();
        const username = $('#register-username').val();
        const email = $('#register-email').val();
        const password = $('#register-password').val();
        
        $.ajax({
            url: `${API_URL}/users/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ username, email, password }),
            success: function(response) {
                alert('Registration successful. Please log in.');
                $('#login-form').show();
                $('#register-form').hide();
            },
            error: function(xhr, status, error) {
                console.error('Registration error:', xhr.responseText);
                alert('Registration failed: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });

    function fetchNotes(filter = {}) {
        currentFilter = filter;
        let url = `${API_URL}/notes`;
        if (filter.isArchived) {
            url += '/archived';
            currentView = 'archive';
        } else if (filter.isDeleted) {
            url += '/trash';
            currentView = 'trash';
        } else if (filter.isReminder) {
            url += '/reminders';
            currentView = 'reminders';
        } else {
            currentView = 'home';
        }
    
        if (filter.search) {
            url += `${url.includes('?') ? '&' : '?'}search=${encodeURIComponent(filter.search)}`;
        }
    
        $.ajax({
            url: url,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token },
            success: function(notes) {
                if (filter.search) {
                    notes = filterNotesBySearch(notes, filter.search);
                }
                displayNotes(notes);
                updateNewNoteButtonVisibility();
                console.log("Notes fetched, current view:", currentView);
            },
            error: function(xhr, status, error) {
                console.error('Error fetching notes:', xhr.responseText);
            }
        });
    }
    
    function filterNotesBySearch(notes, searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        return notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    function displayNotes(notes) {
        const notesList = $('#notes-list');
        notesList.empty();
        if (notes.length === 0) {
            notesList.append($('<p>').text(`No notes found in ${currentView === 'home' ? 'active notes' : currentView}`));
            return;
        }
        notes.forEach(note => {
            const noteCard = $('<div>').addClass('col-md-4 mb-3');
            const card = $('<div>').addClass('card').css('background-color', note.backgroundColor);
            const cardBody = $('<div>').addClass('card-body');
            
            cardBody.append($('<h5>').addClass('card-title').text(note.title));
            cardBody.append($('<p>').addClass('card-text').text(note.content));
    
            const tagsElement = $('<p>').addClass('card-text');
            note.tags.forEach(tag => {
                tagsElement.append($('<span>').addClass('badge badge-secondary mr-1').text(tag));
            });
            cardBody.append(tagsElement);
    
            if (note.reminderDate) {
                const reminderDate = new Date(note.reminderDate);
                cardBody.append($('<p>').addClass('card-text text-muted').text(`Reminder: ${reminderDate.toLocaleString()}`));
            }
    
            card.append(cardBody);
            
            if (currentView !== 'trash') {
                const actionButtons = $('<div>').addClass('card-footer');
                actionButtons.append($('<button>').addClass('btn btn-sm btn-primary mr-2').text('Edit').click(function() {
                    editNote(note);
                }));
                actionButtons.append($('<button>').addClass('btn btn-sm btn-warning mr-2').text(note.isArchived ? 'Unarchive' : 'Archive').click(function() {
                    toggleArchiveNote(note._id, !note.isArchived);
                }));
                actionButtons.append($('<button>').addClass('btn btn-sm btn-danger').text('Delete').click(function() {
                    deleteNote(note._id);
                }));
                card.append(actionButtons);
            }
            
            noteCard.append(card);
            notesList.append(noteCard);
        });
    }

    function updateNewNoteButtonVisibility() {
        if (currentView === 'home') {
            $('#new-note-btn').show();
        } else {
            $('#new-note-btn').hide();
        }
    console.log("Current view:", currentView); // Add this for debugging
    console.log("New note button visibility:", $('#new-note-btn').is(":visible"));
    }

    $('#new-note-btn').click(function() {
        $('#note-form')[0].reset();
        $('#note-modal').modal('show');
    });

    $('#note-form').submit(function(e) {
        e.preventDefault();
        const title = $('#note-title').val();
        const content = $('#note-content').val();
        const tags = $('#note-tags').val().split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        const backgroundColor = $('#note-color').val();
        const reminderDate = $('#note-reminder').val() ? new Date($('#note-reminder').val()).toISOString() : null;
       
        if (tags.length > 9) {
            alert('You can add a maximum of 9 tags to a note.');
            return;
        }

        const noteData = { title, content, tags, backgroundColor, reminderDate };

        $.ajax({
            url: `${API_URL}/notes`,
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            contentType: 'application/json',
            data: JSON.stringify(noteData),
            success: function(response) {
                $('#note-modal').modal('hide');
                fetchNotes(currentFilter);
            },
            error: function(xhr, status, error) {
                console.error('Error creating note:', xhr.responseText);
                alert('Error creating note: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    });

    function editNote(note) {
        $('#note-title').val(note.title);
        $('#note-content').val(note.content);
        $('#note-tags').val(note.tags.join(', '));
        $('#note-color').val(note.backgroundColor);
        $('#note-reminder').val(note.reminderDate ? new Date(note.reminderDate).toISOString().slice(0, 16) : '');
        $('#note-modal').modal('show');
        
        $('#note-form').off('submit').submit(function(e) {
            e.preventDefault();
            const updatedNote = {
                title: $('#note-title').val(),
                content: $('#note-content').val(),
                tags: $('#note-tags').val().split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
                backgroundColor: $('#note-color').val(),
                reminderDate: $('#note-reminder').val() ? new Date($('#note-reminder').val()).toISOString() : null
            };
            if (updatedNote.tags.length > 9) {
                alert('You can add a maximum of 9 tags to a note.');
                return;
            }

            $.ajax({
                url: `${API_URL}/notes/${note._id}`,
                method: 'PATCH',
                headers: { 'Authorization': 'Bearer ' + token },
                contentType: 'application/json',
                data: JSON.stringify(updatedNote),
                success: function(response) {
                    $('#note-modal').modal('hide');
                    fetchNotes(currentFilter);
                },
                error: function(xhr, status, error) {
                    console.error('Error updating note:', xhr.responseText);
                    alert('Error updating note: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
                }
            });
        });
    }

    function deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            $.ajax({
                url: `${API_URL}/notes/${noteId}`,
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token },
                success: function(response) {
                    fetchNotes(currentFilter);
                },
                error: function(xhr, status, error) {
                    console.error('Error deleting note:', xhr.responseText);
                    alert('Error deleting note: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
                }
            });
        }
    }

    function toggleArchiveNote(noteId, archive) {
        $.ajax({
            url: `${API_URL}/notes/${noteId}/archive`,
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token },
            contentType: 'application/json',
            data: JSON.stringify({ isArchived: archive }),
            success: function(response) {
                console.log('Archive toggle successful:', response);
                fetchNotes(currentFilter);
            },
            error: function(xhr, status, error) {
                console.error('Error archiving note:', xhr.responseText);
                alert('Error archiving note: ' + (xhr.responseJSON ? xhr.responseJSON.error : 'Unknown error'));
            }
        });
    }

    $('#home-btn').click(function() {
        fetchNotes();
    });

    $('#archived-btn').click(function() {
        fetchNotes({ isArchived: true });
    });

    $('#trash-btn').click(function() {
        fetchNotes({ isDeleted: true });
    });

    $('#reminder-btn').click(function() {
        fetchNotes({ isReminder: true });
    });

    $('#search-form').submit(function(e) {
        e.preventDefault();
        const searchTerm = $('#search-input').val();
        currentSearchTerm = searchTerm;
        fetchNotes({ ...currentFilter, search: searchTerm });
    });

    updateAuthUI();
});