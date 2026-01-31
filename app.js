// ===========================
// THINKING TOOL - APP LOGIC
// ===========================

// --- STEP 1: Find the HTML elements we need to work with ---
const ideaInput = document.getElementById("idea-input");
const addButton = document.getElementById("add-button");
const ideasContainer = document.getElementById("ideas-container");
const emptyMessage = document.getElementById("empty-message");
const filterBar = document.getElementById("filter-bar");
const projectSelect = document.getElementById("project-select");
const newProjectBtn = document.getElementById("new-project-btn");
const renameProjectBtn = document.getElementById("rename-project-btn");
const deleteProjectBtn = document.getElementById("delete-project-btn");

// Track which tag filter is currently active
let activeFilter = "all";

// Track which view mode is active: "list" or "tree"
let activeView = "list";

// Track the currently active project
let activeProject = null;


// --- PROJECT MANAGEMENT ---

function loadProjects() {
    const saved = localStorage.getItem("thinking-tool-projects");
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

function saveProjects(projects) {
    localStorage.setItem("thinking-tool-projects", JSON.stringify(projects));
}

// One-time migration: move old ideas into a default project
function migrateOldData() {
    const projects = loadProjects();
    if (projects.length > 0) return; // already migrated or projects exist

    const oldIdeas = localStorage.getItem("thinking-tool-ideas");
    if (oldIdeas) {
        // Create default project
        const defaultProject = {
            id: 1,
            name: "My First Project",
            createdAt: new Date().toISOString()
        };
        saveProjects([defaultProject]);

        // Move old ideas into project-scoped key
        localStorage.setItem("thinking-tool-ideas-1", oldIdeas);

        // Remove old key
        localStorage.removeItem("thinking-tool-ideas");
    } else {
        // No old data — create a default empty project
        const defaultProject = {
            id: 1,
            name: "My First Project",
            createdAt: new Date().toISOString()
        };
        saveProjects([defaultProject]);
    }
}

function switchProject(projectId) {
    activeProject = projectId;
    activeFilter = "all";
    guidedStep = 0;
    guidedAnswers = [];
    renderProjectBar();
    renderFilterBar();
    renderIdeas();
}

function createProject(name) {
    const projects = loadProjects();
    const maxId = projects.reduce(function (max, p) { return p.id > max ? p.id : max; }, 0);
    const newProject = {
        id: maxId + 1,
        name: name,
        createdAt: new Date().toISOString()
    };
    projects.push(newProject);
    saveProjects(projects);
    switchProject(newProject.id);
}

function renameProject() {
    const projects = loadProjects();
    const current = projects.find(function (p) { return p.id === activeProject; });
    if (!current) return;

    const newName = prompt("Rename project:", current.name);
    if (newName === null || newName.trim() === "") return;

    current.name = newName.trim();
    saveProjects(projects);
    renderProjectBar();
}

function deleteProject() {
    const projects = loadProjects();
    if (projects.length <= 1) {
        alert("You can't delete your only project.");
        return;
    }

    const current = projects.find(function (p) { return p.id === activeProject; });
    if (!current) return;

    if (!confirm('Delete project "' + current.name + '" and all its ideas?')) return;

    // Remove project ideas from storage
    localStorage.removeItem("thinking-tool-ideas-" + activeProject);

    // Remove project from list
    const remaining = projects.filter(function (p) { return p.id !== activeProject; });
    saveProjects(remaining);

    // Switch to first remaining project
    switchProject(remaining[0].id);
}

function renderProjectBar() {
    const projects = loadProjects();
    projectSelect.innerHTML = "";

    for (var i = 0; i < projects.length; i++) {
        var option = document.createElement("option");
        option.value = projects[i].id;
        option.textContent = projects[i].name;
        if (projects[i].id === activeProject) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    }
}


// --- STEP 2: Load any saved ideas from the browser's storage ---
function loadIdeas() {
    const saved = localStorage.getItem("thinking-tool-ideas-" + activeProject);
    if (saved) {
        return JSON.parse(saved);
    } else {
        return [];
    }
}


// --- STEP 3: Save ideas to the browser's storage ---
function saveIdeas(ideas) {
    localStorage.setItem("thinking-tool-ideas-" + activeProject, JSON.stringify(ideas));
}


// --- STEP 4: Extract #tags from text ---
function extractTags(text) {
    const tagPattern = /#(\w+)/g;
    const tags = [];
    let match;

    while ((match = tagPattern.exec(text)) !== null) {
        const tag = match[1].toLowerCase();
        if (!tags.includes(tag)) {
            tags.push(tag);
        }
    }

    return tags;
}


// --- STEP 5: Get all unique tags across every idea ---
function getAllTags() {
    const ideas = loadIdeas();
    const allTags = [];

    for (const idea of ideas) {
        const tags = idea.tags || [];
        for (const tag of tags) {
            if (!allTags.includes(tag)) {
                allTags.push(tag);
            }
        }
    }

    return allTags.sort();
}


// --- STEP 6: Helper — find an idea by its ID ---
function findIdeaById(id) {
    const ideas = loadIdeas();
    for (const idea of ideas) {
        if (idea.id === id) {
            return idea;
        }
    }
    return null;
}


// --- STEP 7: Helper — count how many ideas link TO a given idea ---
// (i.e., how many "branches" grow from this thought)
function countBranches(id) {
    const ideas = loadIdeas();
    let count = 0;
    for (const idea of ideas) {
        if (idea.linkedTo === id) {
            count++;
        }
    }
    return count;
}


// --- STEP 8: Helper — get a short preview of an idea's text ---
function getPreview(text, maxLength) {
    const clean = text.replace(/#\w+/g, "").trim();
    if (clean.length <= maxLength) {
        return clean;
    }
    return clean.substring(0, maxLength) + "...";
}


// --- STEP 9: Build the filter buttons ---
function renderFilterBar() {
    filterBar.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.className = "filter-button" + (activeFilter === "all" ? " active" : "");
    allButton.textContent = "All";
    allButton.dataset.tag = "all";
    allButton.addEventListener("click", function () {
        activeFilter = "all";
        renderFilterBar();
        renderIdeas();
    });
    filterBar.appendChild(allButton);

    const tags = getAllTags();
    for (const tag of tags) {
        const button = document.createElement("button");
        button.className = "filter-button" + (activeFilter === tag ? " active" : "");
        button.textContent = "#" + tag;
        button.dataset.tag = tag;
        button.addEventListener("click", function () {
            activeFilter = tag;
            renderFilterBar();
            renderIdeas();
        });
        filterBar.appendChild(button);
    }
}


// --- STEP 10: Display a single idea card on the page ---
function createIdeaCard(idea) {
    const card = document.createElement("div");
    card.className = "idea-card" + (idea.isTrunk ? " is-trunk" : "");

    // Format the timestamp
    const time = new Date(idea.timestamp);
    const timeString = time.toLocaleDateString() + " at " + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Build the tags HTML
    const tags = idea.tags || [];
    let tagsHTML = "";
    if (tags.length > 0) {
        tagsHTML = '<div class="idea-tags">';
        for (const tag of tags) {
            tagsHTML += '<span class="tag">#' + escapeHTML(tag) + '</span>';
        }
        tagsHTML += '</div>';
    }

    // Build the link display — show what this thought builds on
    let linkHTML = "";
    if (idea.linkedTo) {
        const parent = findIdeaById(idea.linkedTo);
        if (parent) {
            const preview = getPreview(parent.text, 40);
            linkHTML = '<div class="idea-link"><span class="link-label">builds on: </span>' + escapeHTML(preview) + '</div>';
        }
    }

    // Show how many thoughts branch from this one
    const branches = countBranches(idea.id);
    let branchHTML = "";
    if (branches > 0) {
        branchHTML = '<div class="idea-branches">' + branches + (branches === 1 ? ' thought' : ' thoughts') + ' build on this</div>';
    }

    // Clean text (remove inline #tags)
    const cleanText = idea.text.replace(/#\w+/g, "").trim();

    // Trunk label (only shown on trunk cards)
    const trunkLabelHTML = idea.isTrunk ? '<div class="trunk-label">★ TRUNK — Core Idea</div>' : '';

    card.innerHTML = `
        <button class="delete-button" title="Delete this thought">x</button>
        ${trunkLabelHTML}
        <div class="idea-text">${escapeHTML(cleanText)}</div>
        ${tagsHTML}
        ${linkHTML}
        ${branchHTML}
        <div class="card-actions">
            ${idea.linkedTo
                ? '<button class="unlink-button">Unlink</button>'
                : '<button class="link-button">Link to another thought</button>'
            }
            <button class="trunk-button">${idea.isTrunk ? 'Remove trunk' : 'Mark as trunk'}</button>
        </div>
        <div class="idea-time">${timeString}</div>
        <div class="edit-hint">click text to edit</div>
    `;

    // Delete button
    const deleteBtn = card.querySelector(".delete-button");
    deleteBtn.addEventListener("click", function () {
        deleteIdea(idea.id);
    });

    // Click text to edit
    const textDiv = card.querySelector(".idea-text");
    textDiv.addEventListener("click", function () {
        enterEditMode(card, idea);
    });

    // Link / Unlink button
    const linkBtn = card.querySelector(".link-button");
    const unlinkBtn = card.querySelector(".unlink-button");

    if (linkBtn) {
        linkBtn.addEventListener("click", function () {
            showLinkPicker(card, idea);
        });
    }

    if (unlinkBtn) {
        unlinkBtn.addEventListener("click", function () {
            unlinkIdea(idea.id);
        });
    }

    // Trunk button
    const trunkBtn = card.querySelector(".trunk-button");
    trunkBtn.addEventListener("click", function () {
        toggleTrunk(idea.id);
    });

    return card;
}


// --- STEP 10b: Toggle trunk status on an idea ---
// Only one idea can be the trunk at a time
function toggleTrunk(id) {
    const ideas = loadIdeas();

    for (const idea of ideas) {
        if (idea.id === id) {
            // If it's already the trunk, remove trunk status
            // Otherwise, make it the trunk
            idea.isTrunk = !idea.isTrunk;
        } else {
            // Remove trunk from all other ideas (only one trunk allowed)
            idea.isTrunk = false;
        }
    }

    saveIdeas(ideas);
    renderIdeas();
}


// --- STEP 11: Show the link picker (list of other thoughts to link to) ---
function showLinkPicker(card, idea) {
    // Remove any existing picker first
    const existing = card.querySelector(".link-picker");
    if (existing) {
        existing.remove();
        return;
    }

    const ideas = loadIdeas();

    // Filter out the current idea (can't link to yourself)
    const options = ideas.filter(function (other) {
        return other.id !== idea.id;
    });

    if (options.length === 0) {
        return;  // no other thoughts to link to
    }

    // Build the picker
    const picker = document.createElement("div");
    picker.className = "link-picker";

    const title = document.createElement("div");
    title.className = "link-picker-title";
    title.textContent = "Which thought does this build on?";
    picker.appendChild(title);

    // Add an option button for each other thought
    for (const option of options.slice().reverse()) {
        const btn = document.createElement("button");
        btn.className = "link-option";
        btn.textContent = getPreview(option.text, 60);
        btn.addEventListener("click", function () {
            linkIdea(idea.id, option.id);
        });
        picker.appendChild(btn);
    }

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "link-cancel";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", function () {
        picker.remove();
    });
    picker.appendChild(cancelBtn);

    // Insert the picker into the card
    card.appendChild(picker);
}


// --- STEP 12: Link one idea to another ---
function linkIdea(childId, parentId) {
    const ideas = loadIdeas();

    for (const idea of ideas) {
        if (idea.id === childId) {
            idea.linkedTo = parentId;
            break;
        }
    }

    saveIdeas(ideas);
    renderIdeas();
}


// --- STEP 13: Remove a link ---
function unlinkIdea(id) {
    const ideas = loadIdeas();

    for (const idea of ideas) {
        if (idea.id === id) {
            delete idea.linkedTo;
            break;
        }
    }

    saveIdeas(ideas);
    renderIdeas();
}


// --- STEP 14: Switch a card into edit mode ---
function enterEditMode(card, idea) {
    card.innerHTML = `
        <textarea class="edit-textarea" rows="3">${escapeHTML(idea.text)}</textarea>
        <div class="edit-buttons">
            <button class="save-button">Save</button>
            <button class="cancel-button">Cancel</button>
        </div>
    `;

    const textarea = card.querySelector(".edit-textarea");
    const saveBtn = card.querySelector(".save-button");
    const cancelBtn = card.querySelector(".cancel-button");

    textarea.focus();
    textarea.selectionStart = textarea.value.length;

    saveBtn.addEventListener("click", function () {
        saveEdit(idea.id, textarea.value.trim());
    });

    cancelBtn.addEventListener("click", function () {
        renderIdeas();
    });

    textarea.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            saveEdit(idea.id, textarea.value.trim());
        }
        if (event.key === "Escape") {
            renderIdeas();
        }
    });
}


// --- STEP 15: Save an edited idea ---
function saveEdit(id, newText) {
    if (newText === "") {
        return;
    }

    const ideas = loadIdeas();

    for (const idea of ideas) {
        if (idea.id === id) {
            idea.text = newText;
            idea.tags = extractTags(newText);
            break;
        }
    }

    saveIdeas(ideas);
    renderFilterBar();
    renderIdeas();
}


// --- STEP 16: Find children of a given idea ---
function getChildren(parentId, allIdeas) {
    return allIdeas.filter(function (idea) {
        return idea.linkedTo === parentId;
    });
}


// --- STEP 17: Calculate the width each subtree needs ---
// Each leaf node = 1 unit wide. A parent's width = sum of children's widths.
// Returns an object: { idea, children: [...subtrees], width }
function buildLayoutTree(idea, allIdeas) {
    const children = getChildren(idea.id, allIdeas);

    if (children.length === 0) {
        return { idea: idea, children: [], width: 1 };
    }

    const childTrees = children.map(function (child) {
        return buildLayoutTree(child, allIdeas);
    });

    let totalWidth = 0;
    for (const ct of childTrees) {
        totalWidth += ct.width;
    }

    return { idea: idea, children: childTrees, width: totalWidth };
}


// --- STEP 18: Position nodes on the canvas ---
// Walks the layout tree and assigns x, y coordinates to each node.
// Returns a flat list of { idea, x, y, parentX, parentY } for rendering.
var NODE_W = 180;   // card width in pixels
var NODE_H = 80;    // estimated card height
var H_GAP = 20;     // horizontal gap between nodes
var V_GAP = 60;     // vertical gap between levels

function positionNodes(layoutTree, startX, startY) {
    var nodes = [];
    var lines = [];

    function walk(tree, x, y, parentCenterX, parentBottomY) {
        // This node's center
        var centerX = x + (tree.width * (NODE_W + H_GAP) - H_GAP) / 2;
        var nodeLeft = centerX - NODE_W / 2;

        nodes.push({
            idea: tree.idea,
            x: nodeLeft,
            y: y
        });

        // If there's a parent, draw a line from parent's bottom-center to this node's top-center
        if (parentCenterX !== null) {
            lines.push({
                x1: parentCenterX,
                y1: parentBottomY,
                x2: centerX,
                y2: y
            });
        }

        // Position children
        var childX = x;
        for (var i = 0; i < tree.children.length; i++) {
            walk(
                tree.children[i],
                childX,
                y + NODE_H + V_GAP,
                centerX,
                y + NODE_H
            );
            childX += tree.children[i].width * (NODE_W + H_GAP);
        }
    }

    walk(layoutTree, startX, startY, null, null);

    return { nodes: nodes, lines: lines };
}


// --- STEP 19: Show expanded popup for a tree node ---
function showExpandedNode(idea) {
    var cleanText = idea.text.replace(/#\w+/g, "").trim();
    var tags = idea.tags || [];
    var time = new Date(idea.timestamp);
    var timeString = time.toLocaleDateString() + " at " + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var branches = countBranches(idea.id);

    // Create the overlay
    var overlay = document.createElement("div");
    overlay.className = "vtree-expanded";

    var card = document.createElement("div");
    card.className = "vtree-expanded-card" + (idea.isTrunk ? " is-trunk" : "");

    var trunkLabel = idea.isTrunk ? '<div class="vtree-trunk-label">★ Trunk — Core Idea</div>' : '';

    var tagsHTML = "";
    if (tags.length > 0) {
        tagsHTML = '<div class="vtree-tags">';
        for (var t = 0; t < tags.length; t++) {
            tagsHTML += '<span class="tag">#' + escapeHTML(tags[t]) + '</span>';
        }
        tagsHTML += '</div>';
    }

    var branchInfo = "";
    if (branches > 0) {
        branchInfo = '<div class="vtree-branches-info">' + branches + (branches === 1 ? ' thought builds' : ' thoughts build') + ' on this</div>';
    }

    // Show parent info if linked
    var parentInfo = "";
    if (idea.linkedTo) {
        var parent = findIdeaById(idea.linkedTo);
        if (parent) {
            var parentPreview = getPreview(parent.text, 50);
            parentInfo = '<div class="vtree-branches-info" style="color: #888;">builds on: ' + escapeHTML(parentPreview) + '</div>';
        }
    }

    card.innerHTML = trunkLabel +
        '<div class="vtree-full-text">' + escapeHTML(cleanText) + '</div>' +
        tagsHTML +
        parentInfo +
        branchInfo +
        '<div class="vtree-time">' + timeString + '</div>' +
        '<button class="vtree-close">Close</button>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Close when clicking the close button
    card.querySelector(".vtree-close").addEventListener("click", function () {
        overlay.remove();
    });

    // Close when clicking the dark background
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Close on Escape key
    function onEscape(e) {
        if (e.key === "Escape") {
            overlay.remove();
            document.removeEventListener("keydown", onEscape);
        }
    }
    document.addEventListener("keydown", onEscape);
}


// --- STEP 20: Render the visual tree view ---
function renderTreeView(ideas) {
    ideasContainer.innerHTML = "";

    if (ideas.length === 0) {
        var msg = document.createElement("p");
        msg.id = "empty-message";
        msg.style.textAlign = "center";
        msg.style.color = "#9a8872";
        msg.style.padding = "40px";
        msg.style.fontStyle = "italic";
        msg.textContent = "No ideas yet. Start by adding one below.";
        ideasContainer.appendChild(msg);
        return;
    }

    // Find root ideas (no parent, or parent doesn't exist in current set)
    var rootIdeas = ideas.filter(function (idea) {
        if (!idea.linkedTo) return true;
        var parentExists = ideas.find(function (other) { return other.id === idea.linkedTo; });
        return !parentExists;
    });

    // Separate trunk from other roots
    var trunk = ideas.find(function (idea) { return idea.isTrunk; });

    // Build list of tree roots to display: trunk first, then other unlinked roots that have children
    var treeRoots = [];
    if (trunk) {
        treeRoots.push(trunk);
    }

    // Find roots that aren't the trunk but have branches (mini trees)
    for (var i = 0; i < rootIdeas.length; i++) {
        if (trunk && rootIdeas[i].id === trunk.id) continue;
        var hasKids = getChildren(rootIdeas[i].id, ideas).length > 0;
        if (hasKids) {
            treeRoots.push(rootIdeas[i]);
        }
    }

    // Collect loose thoughts: roots with no children and not trunk
    var looseThoughts = [];
    for (var j = 0; j < rootIdeas.length; j++) {
        if (trunk && rootIdeas[j].id === trunk.id) continue;
        var kids = getChildren(rootIdeas[j].id, ideas).length;
        if (kids === 0) {
            looseThoughts.push(rootIdeas[j]);
        }
    }

    if (treeRoots.length === 0 && looseThoughts.length > 0) {
        // No tree structure at all, just show loose thoughts
        var label = document.createElement("div");
        label.className = "tree-section-label";
        label.textContent = "All thoughts (link them to build a tree)";
        ideasContainer.appendChild(label);

        var looseContainer = document.createElement("div");
        looseContainer.className = "loose-thoughts";
        for (var lt = 0; lt < looseThoughts.length; lt++) {
            var lCard = document.createElement("div");
            lCard.className = "loose-thought-card";
            var cleanT = looseThoughts[lt].text.replace(/#\w+/g, "").trim();
            lCard.innerHTML = '<div class="vtree-text">' + escapeHTML(getPreview(cleanT, 50)) + '</div>';
            looseContainer.appendChild(lCard);
        }
        ideasContainer.appendChild(looseContainer);
        return;
    }

    // Build and render each tree
    for (var r = 0; r < treeRoots.length; r++) {
        var layoutTree = buildLayoutTree(treeRoots[r], ideas);
        var positioned = positionNodes(layoutTree, 0, 0);

        // Calculate canvas size
        var maxX = 0;
        var maxY = 0;
        for (var n = 0; n < positioned.nodes.length; n++) {
            var right = positioned.nodes[n].x + NODE_W;
            var bottom = positioned.nodes[n].y + NODE_H;
            if (right > maxX) maxX = right;
            if (bottom > maxY) maxY = bottom;
        }

        var canvasWidth = maxX + 20;
        var canvasHeight = maxY + 20;

        // Create the scrollable canvas
        var canvas = document.createElement("div");
        canvas.className = "visual-tree-canvas";

        var inner = document.createElement("div");
        inner.className = "visual-tree-inner";
        inner.style.width = canvasWidth + "px";
        inner.style.height = canvasHeight + "px";

        // Draw SVG connector lines
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "visual-tree-svg");
        svg.setAttribute("width", canvasWidth);
        svg.setAttribute("height", canvasHeight);

        for (var l = 0; l < positioned.lines.length; l++) {
            var line = positioned.lines[l];
            var path = document.createElementNS(svgNS, "path");

            // Draw a curved line from parent bottom to child top
            var midY = line.y1 + (line.y2 - line.y1) / 2;
            var d = "M " + line.x1 + " " + line.y1 +
                    " C " + line.x1 + " " + midY +
                    " " + line.x2 + " " + midY +
                    " " + line.x2 + " " + line.y2;

            path.setAttribute("d", d);
            path.setAttribute("stroke", "#c9b896");
            path.setAttribute("stroke-width", "2");
            path.setAttribute("fill", "none");

            // Trunk connections get gold lines
            if (treeRoots[r].isTrunk) {
                path.setAttribute("stroke", "#b8860baa");
            }

            svg.appendChild(path);
        }

        inner.appendChild(svg);

        // Place node cards
        for (var p = 0; p < positioned.nodes.length; p++) {
            var nodeData = positioned.nodes[p];
            var idea = nodeData.idea;

            var nodeEl = document.createElement("div");
            nodeEl.className = "vtree-node" + (idea.isTrunk ? " is-trunk" : "");
            nodeEl.style.left = nodeData.x + "px";
            nodeEl.style.top = nodeData.y + "px";

            var cleanText = idea.text.replace(/#\w+/g, "").trim();
            var tags = idea.tags || [];

            var trunkLabel = idea.isTrunk ? '<div class="vtree-trunk-label">★ Trunk</div>' : '';

            var tagsHTML = "";
            if (tags.length > 0) {
                tagsHTML = '<div class="vtree-tags">';
                for (var t = 0; t < tags.length; t++) {
                    tagsHTML += '<span class="tag">#' + escapeHTML(tags[t]) + '</span>';
                }
                tagsHTML += '</div>';
            }

            nodeEl.innerHTML = trunkLabel +
                '<div class="vtree-text">' + escapeHTML(getPreview(cleanText, 60)) + '</div>' +
                tagsHTML;

            // Click to expand and see full text
            (function(clickIdea) {
                nodeEl.addEventListener("click", function () {
                    showExpandedNode(clickIdea);
                });
            })(idea);

            inner.appendChild(nodeEl);
        }

        canvas.appendChild(inner);
        ideasContainer.appendChild(canvas);
    }

    // Show loose thoughts below the tree(s)
    if (looseThoughts.length > 0) {
        var looseLabel = document.createElement("div");
        looseLabel.className = "tree-section-label";
        looseLabel.textContent = "Unconnected thoughts";
        ideasContainer.appendChild(looseLabel);

        var looseDiv = document.createElement("div");
        looseDiv.className = "loose-thoughts";
        for (var m = 0; m < looseThoughts.length; m++) {
            var card = document.createElement("div");
            card.className = "loose-thought-card";
            var cText = looseThoughts[m].text.replace(/#\w+/g, "").trim();
            card.innerHTML = '<div class="vtree-text">' + escapeHTML(getPreview(cText, 50)) + '</div>';

            // Click to expand loose thoughts too
            (function(clickIdea) {
                card.addEventListener("click", function () {
                    showExpandedNode(clickIdea);
                });
            })(looseThoughts[m]);

            looseDiv.appendChild(card);
        }
        ideasContainer.appendChild(looseDiv);
    }
}


// --- STEP 20: Render ALL ideas to the page (with filtering) ---
function renderIdeas() {
    ideasContainer.innerHTML = "";

    let ideas = loadIdeas();

    if (activeFilter !== "all") {
        ideas = ideas.filter(function (idea) {
            const tags = idea.tags || [];
            return tags.includes(activeFilter);
        });
    }

    // Show/hide input area and filter bar based on view
    var inputArea = document.getElementById("input-area");
    if (activeView === "guided") {
        ideasContainer.classList.remove("tree-mode");
        inputArea.style.display = "none";
        filterBar.style.display = "none";
        renderGuidedMode();
        return;
    } else {
        inputArea.style.display = "";
        filterBar.style.display = "";
    }

    if (activeView === "tree") {
        ideasContainer.classList.add("tree-mode");
        renderTreeView(ideas);
        return;
    } else {
        ideasContainer.classList.remove("tree-mode");
    }

    // List view (default)
    if (ideas.length === 0) {
        const msg = document.createElement("p");
        msg.id = "empty-message";
        msg.style.textAlign = "center";
        msg.style.color = "#555";
        msg.style.padding = "40px";
        msg.style.fontStyle = "italic";

        if (activeFilter !== "all") {
            msg.textContent = "No thoughts tagged #" + activeFilter + " yet.";
        } else {
            msg.textContent = "No ideas yet. Start by adding one below.";
        }
        ideasContainer.appendChild(msg);
    } else {
        // Sort: trunk first, then newest to oldest
        const sorted = ideas.slice().sort(function (a, b) {
            if (a.isTrunk && !b.isTrunk) return -1;
            if (!a.isTrunk && b.isTrunk) return 1;
            return b.id - a.id;
        });
        for (const idea of sorted) {
            const card = createIdeaCard(idea);
            ideasContainer.appendChild(card);
        }
    }
}


// --- STEP 17: Add a new idea ---
function addIdea() {
    const text = ideaInput.value.trim();

    if (text === "") {
        return;
    }

    const ideas = loadIdeas();

    const tags = extractTags(text);

    const newIdea = {
        id: Date.now(),
        text: text,
        tags: tags,
        timestamp: new Date().toISOString()
    };

    ideas.push(newIdea);
    saveIdeas(ideas);

    ideaInput.value = "";
    renderFilterBar();
    renderIdeas();
    ideaInput.focus();
}


// --- STEP 18: Delete an idea ---
function deleteIdea(id) {
    const ideas = loadIdeas();

    // Also remove any links pointing to the deleted idea
    const filtered = ideas.filter(function (idea) {
        return idea.id !== id;
    });

    // Clean up: if any idea was linked to the deleted one, remove that link
    for (const idea of filtered) {
        if (idea.linkedTo === id) {
            delete idea.linkedTo;
        }
    }

    saveIdeas(filtered);
    renderFilterBar();
    renderIdeas();
}


// --- STEP 19: Security helper ---
function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


// --- GUIDED THINKING MODE ---

// The structured questions that walk you through an idea
var guidedQuestions = [
    {
        step: "The Spark",
        question: "What's the idea or problem on your mind?",
        hint: "Don't overthink it. Just describe what you're noodling on, even if it's messy.",
        tag: "spark"
    },
    {
        step: "The Problem",
        question: "What problem does this solve?",
        hint: "Who is struggling, and with what? What's broken or missing?",
        tag: "problem"
    },
    {
        step: "The Audience",
        question: "Who is this for?",
        hint: "Describe the person who needs this. Could be you, a specific group, or everyone.",
        tag: "audience"
    },
    {
        step: "What You Know",
        question: "What do you already know about this?",
        hint: "What pieces of the puzzle do you have? What have you seen or experienced that relates?",
        tag: "knowledge"
    },
    {
        step: "What You Don't Know",
        question: "What are you unsure about or stuck on?",
        hint: "Where are the gaps? What questions don't have answers yet?",
        tag: "question"
    },
    {
        step: "The Trunk",
        question: "In one sentence, what is the core idea?",
        hint: "Try to distill everything above into a single clear statement. This becomes your trunk.",
        tag: "core"
    }
];

// Track guided mode state
var guidedStep = 0;
var guidedAnswers = [];

function renderGuidedMode() {
    ideasContainer.innerHTML = "";

    var container = document.createElement("div");
    container.className = "guided-container";

    // Progress bar
    var progress = document.createElement("div");
    progress.className = "guided-progress";
    for (var i = 0; i < guidedQuestions.length; i++) {
        var step = document.createElement("div");
        step.className = "guided-progress-step";
        if (i < guidedStep) step.classList.add("completed");
        if (i === guidedStep) step.classList.add("active");
        progress.appendChild(step);
    }
    container.appendChild(progress);

    // If all steps are complete, show the finish screen
    if (guidedStep >= guidedQuestions.length) {
        renderGuidedComplete(container);
        ideasContainer.appendChild(container);
        return;
    }

    // Show previous answers
    for (var a = 0; a < guidedAnswers.length; a++) {
        var answered = document.createElement("div");
        answered.className = "guided-answered";
        answered.innerHTML =
            '<div class="guided-answered-q">' + escapeHTML(guidedQuestions[a].step) + '</div>' +
            '<div class="guided-answered-a">' + escapeHTML(guidedAnswers[a]) + '</div>';
        container.appendChild(answered);
    }

    // Show current question
    var q = guidedQuestions[guidedStep];
    var card = document.createElement("div");
    card.className = "guided-question-card";

    var isLastStep = (guidedStep === guidedQuestions.length - 1);

    card.innerHTML =
        '<div class="guided-step-number">Step ' + (guidedStep + 1) + ' of ' + guidedQuestions.length + ' — ' + escapeHTML(q.step) + '</div>' +
        '<div class="guided-question">' + escapeHTML(q.question) + '</div>' +
        '<div class="guided-hint">' + escapeHTML(q.hint) + '</div>' +
        '<textarea class="guided-textarea" rows="3" placeholder="Type your answer..."></textarea>' +
        '<div class="guided-buttons">' +
            '<button class="guided-next-btn" disabled>' + (isLastStep ? 'Finish' : 'Next') + '</button>' +
            (isLastStep ? '' : '<button class="guided-skip-btn">Skip</button>') +
        '</div>';

    container.appendChild(card);
    ideasContainer.appendChild(container);

    // Wire up the textarea and buttons
    var textarea = card.querySelector(".guided-textarea");
    var nextBtn = card.querySelector(".guided-next-btn");
    var skipBtn = card.querySelector(".guided-skip-btn");

    // Enable/disable next button based on input
    textarea.addEventListener("input", function () {
        nextBtn.disabled = textarea.value.trim() === "";
    });

    // Auto-focus
    textarea.focus();

    // Next button
    nextBtn.addEventListener("click", function () {
        var answer = textarea.value.trim();
        if (answer === "") return;
        guidedAnswers.push(answer);
        guidedStep++;
        renderIdeas();
    });

    // Skip button (doesn't exist on last step)
    if (skipBtn) {
        skipBtn.addEventListener("click", function () {
            guidedAnswers.push("");  // empty answer for skipped
            guidedStep++;
            renderIdeas();
        });
    }

    // Enter to advance (Shift+Enter for newline)
    textarea.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (textarea.value.trim() !== "") {
                guidedAnswers.push(textarea.value.trim());
                guidedStep++;
                renderIdeas();
            }
        }
    });
}


// Show the completion screen and save everything as linked thoughts
function renderGuidedComplete(container) {
    var card = document.createElement("div");
    card.className = "guided-complete";

    card.innerHTML =
        '<div class="guided-complete-title">Your idea has a shape now.</div>' +
        '<div class="guided-complete-message">' +
            'Your answers have been structured into linked thoughts.<br>' +
            'The core idea is marked as your trunk.<br><br>' +
            'Switch to Tree View to see the full picture.' +
        '</div>' +
        '<button class="guided-complete-btn" id="guided-save-btn">Save & View Tree</button>' +
        '<button class="guided-complete-btn secondary" id="guided-restart-btn">Start Over</button>';

    container.appendChild(card);

    // Use querySelector on the card itself (not document) because
    // the card isn't in the DOM yet when this runs
    var saveBtn = card.querySelector(".guided-complete-btn:not(.secondary)");
    var restartBtn = card.querySelector(".guided-complete-btn.secondary");

    // Save button
    saveBtn.addEventListener("click", function () {
        saveGuidedAnswers();

        // Switch to tree view
        setActiveView("tree");
    });

    // Restart button
    restartBtn.addEventListener("click", function () {
        guidedStep = 0;
        guidedAnswers = [];
        renderIdeas();
    });
}


// Save all guided answers as linked thoughts
function saveGuidedAnswers() {
    var ideas = loadIdeas();

    // First, remove trunk status from any existing trunk
    for (var i = 0; i < ideas.length; i++) {
        ideas[i].isTrunk = false;
    }

    var createdIds = [];

    // Create a thought for each non-empty answer
    for (var s = 0; s < guidedQuestions.length; s++) {
        var answer = guidedAnswers[s];
        if (!answer || answer === "") continue;

        var q = guidedQuestions[s];
        var isLast = (s === guidedQuestions.length - 1);  // last question = the trunk

        var newIdea = {
            id: Date.now() + s,  // ensure unique IDs
            text: answer + " #" + q.tag,
            tags: [q.tag],
            timestamp: new Date().toISOString(),
            isTrunk: isLast
        };

        // Link to the previous answered thought (builds a chain)
        if (createdIds.length > 0) {
            // If this is the trunk (last), link everything TO it instead
            if (isLast) {
                // The trunk doesn't link to others — others link to it
                // We'll fix the links after
            } else {
                // Link to the previous thought
                newIdea.linkedTo = createdIds[createdIds.length - 1];
            }
        }

        ideas.push(newIdea);
        createdIds.push(newIdea.id);
    }

    // Now re-link: make all non-trunk thoughts point to the trunk
    var trunkId = createdIds[createdIds.length - 1];
    for (var j = 0; j < ideas.length; j++) {
        for (var k = 0; k < createdIds.length - 1; k++) {
            if (ideas[j].id === createdIds[k]) {
                ideas[j].linkedTo = trunkId;
            }
        }
    }

    saveIdeas(ideas);
    renderFilterBar();

    // Reset guided state
    guidedStep = 0;
    guidedAnswers = [];
}


// --- STEP 24: Set up event listeners ---
addButton.addEventListener("click", addIdea);

ideaInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        addIdea();
    }
});

// View toggle buttons
const listViewBtn = document.getElementById("list-view-btn");
const treeViewBtn = document.getElementById("tree-view-btn");
const guidedViewBtn = document.getElementById("guided-view-btn");

function setActiveView(view) {
    activeView = view;
    listViewBtn.classList.remove("active");
    treeViewBtn.classList.remove("active");
    guidedViewBtn.classList.remove("active");

    if (view === "list") listViewBtn.classList.add("active");
    if (view === "tree") treeViewBtn.classList.add("active");
    if (view === "guided") guidedViewBtn.classList.add("active");

    renderIdeas();
}

listViewBtn.addEventListener("click", function () { setActiveView("list"); });
treeViewBtn.addEventListener("click", function () { setActiveView("tree"); });
guidedViewBtn.addEventListener("click", function () { setActiveView("guided"); });

// Project bar event listeners
projectSelect.addEventListener("change", function () {
    switchProject(Number(projectSelect.value));
});

newProjectBtn.addEventListener("click", function () {
    var name = prompt("New project name:");
    if (name === null || name.trim() === "") return;
    createProject(name.trim());
});

renameProjectBtn.addEventListener("click", renameProject);
deleteProjectBtn.addEventListener("click", deleteProject);


// --- STEP 25: Start the app! ---
migrateOldData();
var projects = loadProjects();
activeProject = projects[0].id;
renderProjectBar();
renderFilterBar();
renderIdeas();
