'use strict';

require('./style.css');

import reviewTmpl from '../review.hbs';

ymaps.ready(() => {
    let currentReview = {};
    let reviews = [];
    let myMap = new ymaps.Map('map', {
        center: [55.76, 37.62],
        zoom: 14
    }, {
        searchControlProvider: 'yandex#search'
    });
  
    // Создаем собственный макет с информацией о выбранном геообъекте.
    let customItemContentLayout = ymaps.templateLayoutFactory.createClass(
        // Флаг "raw" означает, что данные вставляют "как есть" без экранирования html.
        '<div class=ballon_header>{{ properties.balloonContentHeader|raw }}</div>' +
            '<div class=ballon_body>{{ properties.balloonContentBody|raw }}</div>' +
            '<div class=ballon_footer>{{ properties.balloonContentFooter|raw }}</div>'
    );

    let clusterer = new ymaps.Clusterer({
        preset: 'islands#invertedDarkOrangeClusterIcons',
        openBalloonOnClick: true,
        clusterDisableClickZoom: true,
        clusterOpenBalloonOnClick: true,
        clusterHideIconOnBalloonOpen: false,
        // Устанавливаем стандартный макет балуна кластера "Карусель".
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
        // Устанавливаем собственный макет.
        clusterBalloonItemContentLayout: customItemContentLayout,
        // Устанавливаем режим открытия балуна. 
        // В данном примере балун никогда не будет открываться в режиме панели.
        clusterBalloonPanelMaxMapArea: 0,
        // Устанавливаем размеры макета контента балуна (в пикселях).
        clusterBalloonContentLayoutWidth: 200,
        clusterBalloonContentLayoutHeight: 130,
        // Устанавливаем максимальное количество элементов в нижней панели на одной странице
        clusterBalloonPagerSize: 5
    });

    myMap.geoObjects.add(clusterer);

    // click по адресу в балуне-каруселе
    map.addEventListener('click', e => {
        let target = e.target;

        if (target.className != 'address') {
            return;
        }
        myMap.balloon.close();
        const x = e.clientX;
        const y = e.clientY;

        showAllReviews (target.textContent, [x, y]);
    });
    let address = document.getElementById('address');
    let content = document.getElementById('content');
    let empty = document.getElementById('empty');
    let place = document.getElementById('place');
    let review = document.getElementById('review');
    let reviewContent = document.getElementById('review_content');
    let reviewHead = document.getElementById('review_head');
    let saveBtn = document.getElementById('saveBtn');
    let username = document.getElementById('username');
    let showForm = (position) => {
        myMap.balloon.close();
        review.style.zIndex = 0;
        review.style.display = 'block';

        let x = position[0];
        let y = position[1];

        if (x + review.offsetWidth > document.documentElement.clientWidth) {
            x = document.documentElement.clientWidth - review.offsetWidth - 10;
        }
        if (x < 0) {
            x = 0;
        }
        if (y + review.offsetHeight > document.documentElement.clientHeight) {
            y = document.documentElement.clientHeight - review.offsetHeight - 10;
        }
        if (y < 0) {
            y = 0;
        }
        review.style.left = x +'px';
        review.style.top = y + 'px';
    
        address.textContent = currentReview.address;
        review.style.zIndex = 10;
        username.focus();
    }
    let clearForm = () => {
        username.value = '';
        place.value = '';
        reviewContent.value = '';  
    }
    let clearList = () => {
        empty.style.display = 'block';
        while (content.children.length > 1) {
            content.removeChild(content.lastChild);
        }
    }
    let closeForm = () => {
        review.style.display = 'none';
        clearForm();
        clearList();
    }
    let showAllReviews = (addr, position) => {
        clearForm();
        clearList();
        currentReview = {};
        let len = reviews.length;

        for (let i = 0; i < len; i++) {
            if (reviews[i].address == addr) {
                currentReview.address = reviews[i].address;
                currentReview.coords = reviews[i].coords;
                content.innerHTML += reviewTmpl({ review: reviews[i] });
            }
        }
        if (content.children.length > 1) {
            empty.style.display = 'none';
            showForm(position);
        }
    }

    myMap.events.add('click', e => { 
        let coords = e.get('coords');
        let position = e.get('position');

        address.textContent = '';
        clearForm();
        clearList();

        ymaps.geocode(coords).then(res => {
            currentReview.coords = coords;
            currentReview.address = res.geoObjects.get(0).getAddressLine();
            showForm(position);
        })
        .catch(err => console.log(err));
    });

    myMap.events.add('balloonopen', () => {
        closeForm();
    });

    reviewHead.addEventListener('mousedown', (event) => {
        if (event.target.classList.contains('fa-times')) {
            return;
        }
        let moveTo = (event) => {
            review.style.left = event.pageX - shiftX + 'px';
            review.style.top = event.pageY - shiftY + 'px';
        }
        let coordinates = review.getBoundingClientRect();
        let shiftX = event.pageX - coordinates.left;
        let shiftY = event.pageY - coordinates.top;

        review.style.zIndex = 1000;
        document.addEventListener('mousemove', moveTo);

        reviewHead.addEventListener('mouseup', function mouseUp() {
            document.removeEventListener('mousemove', moveTo);
            reviewHead.removeEventListener('mouseup', mouseUp);
        });
    });

    let closeReviewBtn = document.querySelector('#review_head .fa-times');

    closeReviewBtn.addEventListener('click', closeForm);

    let saveReview = () => {
        let who = username.value,
            where = place.value,
            what = reviewContent.value;

        if (!who || !where || !what) {
            return;
        }
        currentReview.username = who;
        currentReview.place = where;
        currentReview.text = what;
        currentReview.date = new Date().toLocaleString();
        reviews.push(Object.assign({}, currentReview));
        empty.style.display = 'none';
        content.innerHTML += reviewTmpl({ review: currentReview });
        clearForm();
        let header = '<div class="where">' + where + '</div><div class="address">' + currentReview.address + '</div>';
        let placemark = new ymaps.Placemark(currentReview.coords, {
            balloonContentHeader: header,
            balloonContentBody: what,
            balloonContentFooter: currentReview.date,
            hintContent: '<b>' + who + '</b> ' + where
        }, {
            preset: 'islands#redIcon',
            iconColor: '#df6543',
            openBalloonOnClick: false
        });
        let addr = currentReview.address;

        placemark.events.add('click', (e) => {
            showAllReviews (addr, e.get('position'))
        });
        clusterer.add(placemark);    
    }

    saveBtn.addEventListener('click', saveReview);
    reviewContent.addEventListener('keyup', (e) => {
        if (e.keyCode == 13) {
            saveReview();
            username.focus();
        }
    });
});
