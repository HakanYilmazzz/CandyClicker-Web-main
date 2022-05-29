const shop = [
    { "name": "Otomatik Tıklayıcı", "additionalPerClick": 0n, "additionalPerSecond": 1n, "price": 100n },
    { "name": "Şeker Makinesi", "additionalPerClick": 0n, "additionalPerSecond": 5n, "price": 250n },
    { "name": "Büyük Mumlar", "additionalPerClick": 1n, "additionalPerSecond": 0n, "price": 500n },
    { "name": "Büyük Anne", "additionalPerClick": 2n, "additionalPerSecond": 10n, "price": 1000n },
    { "name": "Şeker Dükkanı", "additionalPerClick": 3n, "additionalPerSecond": 15n, "price": 2500n },
    { "name": "Şeker Fabrikası", "additionalPerClick": 5n, "additionalPerSecond": 20n, "price": 5000n },
    { "name": "Şeker Ordusu", "additionalPerClick": 10n, "additionalPerSecond": 50n, "price": 50000n },
    { "name": "Şeker Kralı", "additionalPerClick": 15n, "additionalPerSecond": 60n, "price": 100000n },
    { "name": "Şeker Bombası", "additionalPerClick": 25n, "additionalPerSecond": 100n, "price": 250000n },
    { "name": "Şeker Gezegeni", "additionalPerClick": 50n, "additionalPerSecond": 500n, "price": 500000n },
    { "name": "Şeker Evreni", "additionalPerClick": 100n, "additionalPerSecond": 750n, "price": 1000000n },
    { "name": "Şeker-zaman Sürekliliği", "additionalPerClick": 250n, "additionalPerSecond": 1000n, "price": 2000000n },
    { "name": "Şeker Evreni Portalı", "additionalPerClick": 500n, "additionalPerSecond": 5000n, "price": 5000000n },
    { "name": "Sonsuz Şeker Teoremi", "additionalPerClick": 1000n, "additionalPerSecond": 10000n, "price": 10000000n },
    { "name": "Unobtainium Şekeri", "additionalPerClick": 2500n, "additionalPerSecond": 25000n, "price": 15000000n }
];

const uInt64Max = 2n ** 64n - 1n;

const isOnMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let candyScore = 0n;
let candyPerClick = 1n;
let candyPerSecond = 0n;
let candyPSReincarnationMultiplier = 1n;
let reincarnateCounter = 0n;
let overflowCounter = 0n;
let shopMultiplier = 1n;
const shopPurchasedCount = new Array(shop.length);
shopPurchasedCount.fill(0n);

let clicksTowardSpecial = 0;
let isSpecialActive = false;
let isEndGameVisualActive = false;

let lastClickTime = new Date();
let clicksThisSecond = 0;
const previousClicksPerSecond = [];

let candyPerSecondCycleCount = 0n;

const saveHeader = new Uint8Array([0x43, 0x64, 0x43, 0x6C, 0x6B, 0x31, 0x2E, 0x31]);  // "CdClk1.1"

let timerPerSecond;
let timerCandyPerSecond;
$(window).on('load', function () {
    resizeShop();
    reloadShop();
    updateOverflowBanner();

    if (isOnMobile) {
        $('#download-desktop-paragraph').css('display', 'none');
        $('#save-data-paragraph').css('display', 'none');
    }

    timerPerSecond = setInterval(timerPerSecondElapsed, 1000);
    timerCandyPerSecond = setInterval(timerCandyPerSecondElapsed, 100);

    openHelpPopUp();
});

function calculateInflatedCost(originalPrice, purchasedCount) {
    return BigInt.asUintN(64, originalPrice + (purchasedCount * originalPrice / 4n));
}

function reloadShop() {
    $('#candy-shop').empty();
    for (let i = 0; i < shop.length; i++) {
        let item = shop[i];
        let $template = $('#candy-shop-item-template').contents().clone();
        $template.attr("id", `candy-shop-item-${i}`);
        let tooltip = `Tıklama Başına: +${item.additionalPerClick * shopMultiplier} şeker, Saniye Başına: +${item.additionalPerSecond * shopMultiplier} şeker, Sahip Olduğun: ${shopPurchasedCount[i]} şeker`;
        if (shopMultiplier >= 2n) {
            tooltip += `, x${shopMultiplier} applied`;
        }
        $template.attr("title", tooltip);
        if (isOnMobile) {
            $template.css('height', '36px');
        }
        $template.find('.candy-shop-item-name').text(item.name);
        $template.find('.candy-shop-item-price').text(`(${calculateInflatedCost(item.price, shopPurchasedCount[i]).toLocaleString()})`);
        $template.on('click', function () { shopItemClick(i); });
        $template.appendTo('#candy-shop');
    }
    updateShopPriceColours();
}

function updateShopPriceColours() {
    for (let i = 0; i < shop.length; i++) {
        let price = calculateInflatedCost(shop[i].price, shopPurchasedCount[i]);
        $(`#candy-shop-item-${i}`).find('.candy-shop-item-price').css('color', price <= candyScore ? '' : 'gray');
    }
}

function resizeShop() {
    let $candyShop = $('#candy-shop');
    $candyShop.height($(window).height() - $candyShop.offset().top);
}

function updateOverflowBanner() {
    let $overflowBanner = $('#overflow-banner');
    $overflowBanner.css('visibility', overflowCounter == 0n ? 'hidden' : 'visible');
    if (overflowCounter == 0n) {
        $overflowBanner.text('★');
    }
    else if (overflowCounter < 1000n) {
        $overflowBanner.text('★'.repeat(Number(overflowCounter)));
        if ($overflowBanner.width() > $(window).width() - 20) {
            $overflowBanner.text(`★ x ${overflowCounter}`);
        }
    }
    else {
        $overflowBanner.text(`★ x ${overflowCounter}`);
    }
    $overflowBanner.css('margin-top', -$overflowBanner.height());
}

$(window).on('resize', function () {
    resizeShop();
    updateOverflowBanner();
});

function initiateSpecial() {
    isSpecialActive = true;
    let $mainCandy = $('#main-candy');
    let $perClickMultiplier = $('#per-click-multiplier');
    $mainCandy.attr('src', 'images/candy-special.png');
    $perClickMultiplier.css('visibility', 'visible');
    let $candyMeter = $('#candy-meter');
    setTimeout(function () {
        $mainCandy.attr('src', 'images/candy.png');
        $perClickMultiplier.css('visibility', 'hidden');
        $candyMeter.prop('value', 0);
        isSpecialActive = false;
        clicksTowardSpecial = 0;
    }, 5000);
    let i = 0;
    let timerSpecialCountdown = setInterval(function () {
        if (i == 50) {
            clearTimeout(timerSpecialCountdown);
        }
        else {
            $candyMeter.prop('value', 1000 - (20 * (i + 2)));
            i++;
        }
    }, 100);
}

function endGameVisualUpdate() {
    isEndGameVisualActive = true;
    $('body').css("background-color", '#E5F19E');
}

function undoEndGameVisualUpdate() {
    isEndGameVisualActive = false;
    $('body').css("background-color", '');
}

function uInt64ToByteArray(num) {
    let bytes = [];
    for (let i = 0n; i < 64n; i += 8n) {
        bytes.push(Number(BigInt.asUintN(8, num >> i)));
    }
    return new Uint8Array(bytes);
}

function byteArrayToUInt64(bytes) {
    let num = 0n;
    for (let i = 0; i < bytes.length; i++) {
        num += BigInt(bytes[i]) << BigInt(i * 8);
    }
    return BigInt.asUintN(64, num);
}

function giveCandy(amount) {
    if (amount == 0n) {
        return;
    }
    let oldCandyScore = candyScore;
    candyScore = BigInt.asUintN(64, candyScore + amount);
    $('#candy-score').text(candyScore.toLocaleString());
    if (oldCandyScore > candyScore) {
        giveOverflow(1n);
    }
    updateShopPriceColours();
}

function givePerSecond(amount) {
    if (amount == 0n) {
        return;
    }
    candyPerSecond = BigInt.asUintN(64, candyPerSecond + amount);
    $('#candy-per-second-value').text(candyPerSecond.toLocaleString());
}

function givePerClick(amount) {
    if (amount == 0n) {
        return;
    }
    candyPerClick = BigInt.asUintN(64, candyPerClick + amount);
    $('#candy-per-click-value').text(candyPerClick.toLocaleString());
}

function giveOverflow(amount) {
    if (amount == 0n) {
        return;
    }
    overflowCounter = BigInt.asUintN(64, overflowCounter + amount);
    updateOverflowBanner();
}

function updateReincarnationMultiplier(multiplier) {
    candyPSReincarnationMultiplier = multiplier;
    $('#per-second-multiplier').css('visibility', multiplier <= 1n || multiplier == uInt64Max ? 'hidden' : '');
    $('#per-second-multiplier-value').text(multiplier.toLocaleString());
}

function openHelpPopUp() {
    clearInterval(timerPerSecond);
    clearInterval(timerCandyPerSecond);

    let $helpPopUp = $('#help-popup-container');
    $helpPopUp.css('display', '');
    $helpPopUp.animate({ opacity: '1.0' }, 250);
}

function closeHelpPopUp() {
    timerPerSecond = setInterval(timerPerSecondElapsed, 1000);
    timerCandyPerSecond = setInterval(timerCandyPerSecondElapsed, 100);

    let $helpPopUp = $('#help-popup-container');
    $helpPopUp.animate({ opacity: '0.0' }, 250);
    setTimeout(function () {
        $helpPopUp.css('display', 'none');
    }, 300);
}

function calculateReincarnationCost() {
    let result = BigInt.asUintN(64, 100000000n * (candyPSReincarnationMultiplier + 1n) * (reincarnateCounter + 1n));
    return result >= BigInt.asUintN(64, candyPSReincarnationMultiplier * 100000000n * reincarnateCounter) ? result : uInt64Max;
}

function calculateReincarnationResult() {
    let result = BigInt.asUintN(64, (overflowCounter == 0n ? candyScore : uInt64Max) / 100000000n / (reincarnateCounter + 1n));
    return result >= candyPSReincarnationMultiplier ? result : uInt64Max;
}

function openReincarnationPopUp() {
    clearInterval(timerPerSecond);
    clearInterval(timerCandyPerSecond);

    let reincarnationCost = calculateReincarnationCost();
    let $reincarnationParagraph = $('#reincarnation-paragraph');
    let $endgameReincarnationParagraph = $('#endgame-reincarnation-paragraph');
    let $reincarnationParagraphResultLine = $('#reincarnation-paragraph-result-line');
    let $endgameReincarnationParagraphResultLine = $('#endgame-reincarnation-paragraph-result-line');
    let $reincarnateAgreeButton = $('#reincarnate-agree-button');
    $reincarnationParagraphResultLine.css('display', 'none');
    $endgameReincarnationParagraphResultLine.css('display', 'none');
    $('#reincarnation-paragraph-divisor').text(BigInt.asUintN(64, 100000000n * (reincarnateCounter + 1n)).toLocaleString());
    $('#reincarnation-paragraph-min-cost').text(reincarnationCost.toLocaleString());
    if (candyScore >= reincarnationCost || overflowCounter >= 1) {
        if (candyPSReincarnationMultiplier == uInt64Max) {
            $reincarnationParagraph.css('display', 'none');
            $endgameReincarnationParagraph.css('display', '');
            if (overflowCounter >= 60n) {
                $reincarnateAgreeButton.prop('disabled', false);
                $reincarnateAgreeButton.text("Reenkarne (!)");
                $reincarnateAgreeButton.css('color', '');
                $reincarnateAgreeButton.css('background-color', '');
                $reincarnateAgreeButton.css('border-color', '');
                $endgameReincarnationParagraphResultLine.css('display', '');
                $('#endgame-reincarnation-paragraph-result').text(BigInt.asUintN(64, shopMultiplier + (overflowCounter / 60n)).toLocaleString());
            }
            else {
                $reincarnateAgreeButton.prop('disabled', true);
                $reincarnateAgreeButton.text("Yetersiz Yıldız");
                $reincarnateAgreeButton.css('color', 'gray');
                $reincarnateAgreeButton.css('background-color', '#f4f4f4');
                $reincarnateAgreeButton.css('border-color', '#adb2b5');
            }
        }
        else {
            $reincarnationParagraph.css('display', '');
            $endgameReincarnationParagraph.css('display', 'none');
            $reincarnateAgreeButton.prop('disabled', false);
            $reincarnateAgreeButton.text("Reenkarne");
            $reincarnateAgreeButton.css('color', '');
            $reincarnateAgreeButton.css('background-color', '');
            $reincarnateAgreeButton.css('border-color', '');
            $reincarnationParagraphResultLine.css('display', '');
            $('#reincarnation-paragraph-result').text(calculateReincarnationResult().toLocaleString());
        }
    }
    else {
        $reincarnationParagraph.css('display', '');
        $endgameReincarnationParagraph.css('display', 'none');
        $reincarnateAgreeButton.prop('disabled', true);
        $reincarnateAgreeButton.text("Yetersiz şeker");
        $reincarnateAgreeButton.css('color', 'gray');
        $reincarnateAgreeButton.css('background-color', '#f4f4f4');
        $reincarnateAgreeButton.css('border-color', '#adb2b5');
    }

    let $reincarnationPopUp = $('#reincarnation-popup-container');
    $reincarnationPopUp.css('display', '');
    $reincarnationPopUp.animate({ opacity: '1.0' }, 250);
}

function closeReincarnationPopUp() {
    timerPerSecond = setInterval(timerPerSecondElapsed, 1000);
    timerCandyPerSecond = setInterval(timerCandyPerSecondElapsed, 100);

    let $reincarnationPopUp = $('#reincarnation-popup-container');
    $reincarnationPopUp.animate({ opacity: '0.0' }, 250);
    setTimeout(function () {
        $reincarnationPopUp.css('display', 'none');
    }, 300);
}

$('#main-candy').on('click', function () {
    if (new Date() > new Date(lastClickTime.getTime() + 40)) {
        giveCandy(isSpecialActive ? candyPerClick * 10n : candyPerClick);
        if (!isSpecialActive) {
            clicksTowardSpecial++;
            if (clicksTowardSpecial == 1000) {
                initiateSpecial();
            }
            else {
                $('#candy-meter').prop('value', clicksTowardSpecial);
            }
        }
        lastClickTime = new Date();
        clicksThisSecond++;
        let $mainCandy = $('#main-candy');
        $mainCandy.clearQueue();
        $mainCandy.animate({ width: Math.random() <= 0.05 ? '0px' : '162px' }, 50);
        $mainCandy.animate({ width: '172px' }, 50);
    }
});

function shopItemClick(itemIndex) {
    let purchasedItem = shop[itemIndex];
    let adjustedPrice = calculateInflatedCost(purchasedItem.price, shopPurchasedCount[itemIndex]);
    if (adjustedPrice <= candyScore) {
        candyScore -= adjustedPrice;
        $('#candy-score').text(candyScore.toLocaleString());
        givePerSecond(purchasedItem.additionalPerSecond * shopMultiplier);
        givePerClick(purchasedItem.additionalPerClick * shopMultiplier);
        shopPurchasedCount[itemIndex]++;
        let $clickedItem = $(`#candy-shop-item-${itemIndex}`)
        $clickedItem.find('.candy-shop-item-price').text(`(${calculateInflatedCost(purchasedItem.price, shopPurchasedCount[itemIndex]).toLocaleString()})`);
        let tooltip = `Tıklama başına: +${purchasedItem.additionalPerClick * shopMultiplier} şeker, Saniye Başına:  +${purchasedItem.additionalPerSecond * shopMultiplier} şeker, Sahip olduğun şeker: ${shopPurchasedCount[itemIndex]}`;
        if (shopMultiplier >= 2n) {
            tooltip += `, x${shopMultiplier} applied`;
        }
        $clickedItem.prop("title", tooltip);
    }
    else {
        let $candyScore = $("#candy-score");
        $candyScore.clearQueue();
        $candyScore.animate({ opacity: '0.5' }, 50);
        $candyScore.animate({ opacity: '1.0' }, 50);
    }
}

$('#help-button').on('click', openHelpPopUp);

$('#help-popup-close-button').on('click', closeHelpPopUp);

$('#reincarnate-button').on('click', openReincarnationPopUp);

$('#reincarnation-popup-close-line').on('click', closeReincarnationPopUp);

$('#reincarnate-agree-button').on('click', function () {
    if (candyScore >= calculateReincarnationCost() || overflowCounter >= 1) {
        if (candyPSReincarnationMultiplier != uInt64Max) {
            updateReincarnationMultiplier(calculateReincarnationResult());
            reincarnateCounter++;
        }
        else {
            updateReincarnationMultiplier(1n);
            reincarnateCounter = 0n;
            shopMultiplier += overflowCounter / 60n;
        }
        candyScore = 0n;
        candyPerClick = 1n;
        candyPerSecond = 0n;
        clicksTowardSpecial = 0;
        overflowCounter = 0n;
        shopPurchasedCount.fill(0n);

        $('#candy-score').text(candyScore.toLocaleString());
        $('#candy-per-second-value').text(candyPerSecond.toLocaleString());
        $('#candy-per-click-value').text(candyPerClick.toLocaleString());
        $('#candy-meter').prop('value', clicksTowardSpecial);
        updateOverflowBanner();
        reloadShop();

        closeReincarnationPopUp();
    }
});

function timerPerSecondElapsed() {
    if (!isEndGameVisualActive && candyPSReincarnationMultiplier == uInt64Max) {
        endGameVisualUpdate();
    }
    else if (isEndGameVisualActive && candyPSReincarnationMultiplier != uInt64Max) {
        undoEndGameVisualUpdate();
    }
    let $candyPerSecondEndgame = $('#total-candy-per-second-endgame');
    $candyPerSecondEndgame.css('display', isEndGameVisualActive ? '' : 'none');
    $candyPerSecondEndgame.css('visibility', isEndGameVisualActive && candyPerSecond == 0n ? 'hidden' : '');
    $('#total-candy-per-second').css('display', isEndGameVisualActive ? 'none' : '');
    if ((new Date() - lastClickTime) >= 5000) {
        previousClicksPerSecond.length = 0;
        $('#clicks-per-second-value').text("0.0");
    }
    else {
        previousClicksPerSecond.push(clicksThisSecond);
        clicksThisSecond = 0;
        if (previousClicksPerSecond.length >= 2) {
            $('#clicks-per-second-value').text((previousClicksPerSecond.slice(1).reduce((a, b) => a + b) / (previousClicksPerSecond.length - 1)).toFixed(1));
        }
    }
    if (!isEndGameVisualActive) {
        let perSecond = candyPSReincarnationMultiplier <= 1 ? candyPerSecond : candyPerSecond * candyPSReincarnationMultiplier;
        let clicksPerSecond = previousClicksPerSecond.length >= 2 ? previousClicksPerSecond.slice(1).reduce((a, b) => a + b) / (previousClicksPerSecond.length - 1) : 0;
        let perClick = isSpecialActive ? candyPerClick * 10n : candyPerClick;
        $('#total-candy-per-second-value').text((BigInt(Math.round(Number(perClick) * clicksPerSecond)) + perSecond).toLocaleString());
    }
}

function timerCandyPerSecondElapsed() {
    let amount = candyPSReincarnationMultiplier <= 1n
        ? candyPerSecond
        : candyPerSecond <= BigInt.asUintN(64, candyPerSecond * candyPSReincarnationMultiplier)
            ? BigInt.asUintN(64, candyPerSecond * candyPSReincarnationMultiplier)
            : uInt64Max;
    if (amount == 0n) {
        return;
    }
    let perTick = amount / 10n;
    let remainder = amount % 10n;
    let toGive = perTick;
    if (remainder != 0n && candyPerSecondCycleCount % (10n / remainder) == 0n) {
        toGive++;
    }
    giveCandy(toGive);
    candyPerSecondCycleCount++;
    if (candyPerSecondCycleCount == 10n) {
        candyPerSecondCycleCount = 0n;
    }
}

$(window).bind('beforeunload', function () {
    return "Çıkmak istediğine emin misin? bütün ilerlemen kaybolacak";
});
