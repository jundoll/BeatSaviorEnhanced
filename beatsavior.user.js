// ==UserScript==
// @name         BeatSaviorEnhanced
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  enhance beatsavior-site
// @author       jundoll
// @match        https://www.beatsavior.io/*
// @match        https://beat-savior.herokuapp.com/*
// @icon         https://www.beatsavior.io/img/bsicon_ter.0c7a98a6.svg
// @updateURL    https://github.com/jundoll/BeatSaviorEnhanced/raw/main/beatsavior.user.js
// @downloadURL  https://github.com/jundoll/BeatSaviorEnhanced/raw/main/beatsavior.user.js
// @run-at       document-start
// for Tampermonkey
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_info
// ==/UserScript==


// 現状は比較表表示中の画面にて再読み込みした場合にしか正常に読み込めない。

(function() {
    'use strict';

    class Global {
    }
    Global.baseurl1 = "https://beat-savior.herokuapp.com"
    Global.baseurl2 = "https://www.beatsavior.io"

    function create(tag, attrs, ...children) {
        if (tag === undefined) {
            throw new Error("'tag' not defined");
        }
        const ele = document.createElement(tag);
        if (attrs) {
            for (const [attrName, attrValue] of Object.entries(attrs)) {
                if (attrName === "style") {
                    for (const [styleName, styleValue] of Object.entries(attrs.style)) {
                        ele.style[styleName] = styleValue;
                    }
                }
                else if (attrName === "class") {
                    if (typeof attrs.class === "string") {
                        const classes = attrs.class.split(/ /g).filter(c => c.trim().length > 0);
                        ele.classList.add(...classes);
                    }
                    else {
                        ele.classList.add(...attrs.class);
                    }
                }
                else if (attrName === "for") {
                    ele.htmlFor = attrValue;
                }
                else if (attrName === "selected") {
                    ele.selected = (attrValue ? "selected" : undefined);
                }
                else if (attrName === "disabled") {
                    if (attrValue){
                        ele.setAttribute("disabled", undefined);
                    }
                }
                else if (attrName === "data") {
                    const data_dict = attrs[attrName];
                    for (const [data_key, data_value] of Object.entries(data_dict)) {
                        ele.dataset[data_key] = data_value;
                    }
                }
                else {
                    ele[attrName] = attrs[attrName];
                }
            }
        }
        into(ele, ...children);
        return ele;
    }
    function clear_children(elem) {
        while (elem.lastChild) {
            elem.removeChild(elem.lastChild);
        }
    }
    function intor(parent, ...children) {
        clear_children(parent);
        return into(parent, ...children);
    }
    function into(parent, ...children) {
        for (const child of children) {
            if (typeof child === "string") {
                if (children.length > 1) {
                    parent.appendChild(to_node(child));
                }
                else {
                    parent.textContent = child;
                }
            }
            else if ("then" in child) {
                const dummy = document.createElement("DIV");
                parent.appendChild(dummy);
                (async () => {
                    const node = await child;
                    parent.replaceChild(to_node(node), dummy);
                })();
            }
            else {
                parent.appendChild(child);
            }
        }
        return parent;
    }
    function to_node(elem) {
        if (typeof elem === "string") {
            const text_div = document.createElement("DIV");
            text_div.textContent = elem;
            return text_div;
        }
        return elem;
    }

    function check(elem) {
        if (elem === undefined || elem === null) {
            throw new Error("Expected value to not be null");
        }
        return elem;
    }
    function load() {
        const json = localStorage.getItem("profileScores");
        if (!json) {
            reset_data();
            return;
        }
        try {
            Global.profileScores = JSON.parse(json);
        }
        catch (ex) {
            console.error("Failed to read profileScores cache, resetting!");
            reset_data();
            return;
        }
    }
    function reset_data() {
        Global.profileScores = {};
        localStorage.setItem("profileScores", "{}");
    }
    function is_scorescomparator_page() {
        const comparator1 = window.location.href.toLowerCase().startsWith(Global.baseurl1 + "/#/scorescomparator")
        const comparator2 = window.location.href.toLowerCase().startsWith(Global.baseurl2 + "/#/scorescomparator")
        return comparator1 || comparator2
    }
    function get_user_id_from_profile_link(num) {
        if (!is_scorescomparator_page()) {
            return;
        }
        const span = check(document.querySelector("span.q-gutter-xs"));
        const user_list = span.querySelectorAll("div.user-card");
        const href = user_list[num].querySelector("a").getAttribute("href")
        const user_id = href.match(/^.*\Dprofile\/(\d+)+$/)[1]
        return user_id
    }
    function get_from_date_from_user_and_row(user_id, row_id) {
        return Global.profileScores[user_id][row_id].fromDate
    }
    function get_song_id_from_user_and_row(user_id, row_id) {
        return Global.profileScores[user_id][row_id].id
    }
    function get_from_date_from_user_and_song(user_id, song_id) {
        const scores_list = Global.profileScores[user_id]
        for (let score of scores_list) {
            if (score.id === song_id) {
                return score.fromDate
            }
        }
        return ""
    }
    function setup_from_date_user_site() {
        if (!is_scorescomparator_page()) {
            return;
        }

        // first user
        const first_user_id = get_user_id_from_profile_link(0);

        const table = check(document.querySelector("table.q-table"));
        const table_row = table.querySelectorAll("tbody.q-virtual-scroll__content tr");
        let irow = -1
        let icol = -1
        let song_id = ""
        for (const row of table_row) {
            irow++;
            const table_col = row.querySelectorAll("tr td.score-cell");
            icol = -1
            song_id = get_song_id_from_user_and_row(first_user_id, irow)
            for (const col of table_col) {
                icol++;
                const user_id = get_user_id_from_profile_link(icol);
                let fromDate = ""
                if (icol === 0) {
                    fromDate = get_from_date_from_user_and_row(user_id, irow);
                }
                else {
                    fromDate = get_from_date_from_user_and_song(user_id, song_id);
                }
                // if fromDate still exists
                if (col.querySelector("div.fromDate") !== null) {
                    col.removeChild(col.lastChild);
                }
                into(col, create("div", { class: "fromDate", style: {'text-align': "center"}}, String(fromDate)));
            }
        }
    }

    load();
    let has_loaded_head = false;
    function on_load_head() {
        if (!document.head) {
            return;
        }
        if (has_loaded_head) {
            return;
        }
        //has_loaded_head = true;
    }
    let has_loaded_body = false;
    function on_load_body() {
        if (document.readyState !== "complete" && document.readyState !== "interactive") {
            return;
        }
        if (has_loaded_body) {
            return;
        }
        //has_loaded_body = true;
        setup_from_date_user_site();
    }
    function onload() {
        on_load_head();
        on_load_body();
    }
    onload();
    //window.addEventListener("DOMContentLoaded", onload);
    window.addEventListener("load", onload);
    window.addEventListener("change", onload);


})();
