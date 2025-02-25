// ============================
// [모델 관련 전역 변수]
// ============================
const URL = 'https://teachablemachine.withgoogle.com/models/FQjM8_bg-/';
let model, labelContainer, maxPredictions;

// ============================
// [배열로 여러 이미지 관리]
// ============================
let selectedFiles = [];  // 사용자가 업로드한 File 객체를 담아둘 배열
let previews = [];       // 미리보기용 base64 URL 배열 (UI 표시)

// ============================
// [모델 & 초기화]
// ============================
window.onload = init;
async function init() {
    try {
        const modelURL = URL + 'model.json';
        const metadataURL = URL + 'metadata.json';
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        labelContainer = document.getElementById('label-container');
        console.log("✅ 모델이 정상적으로 로드되었습니다:", model);
    } catch (error) {
        console.error("❌ 모델 로딩 중 오류 발생:", error);
        alert("AI 모델을 불러오는 데 실패했습니다. 인터넷 연결을 확인하세요.");
    }

    // 댓글창 초기화
    initCommentSystem();
    // 히스토리 초기화
    initHistorySystem();
}

// ============================
// [드래그 드롭 이벤트 핸들러]
// ============================
function onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('.image-upload-wrap').classList.add('dragover');
}

function onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('.image-upload-wrap').classList.remove('dragover');
}

function onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('.image-upload-wrap').classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
        readFiles({ files });
    }
}

// ============================
// [이미지 업로드 - multiple]
// ============================
function readFiles(input) {
    if (input.files && input.files.length > 0) {
        // 기존 값 초기화
        selectedFiles = [];
        previews = [];
        document.getElementById('previewContainer').innerHTML = '';
        labelContainer.innerHTML = '';

        // 여러 파일을 배열에 담기
        for (const file of input.files) {
            selectedFiles.push(file);
        }

        // 미리보기 표시
        selectedFiles.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                previews[idx] = e.target.result; // base64 url
                addPreviewItem(idx, e.target.result);
            };
            reader.readAsDataURL(file);
        });
    } else {
        // 아무것도 선택 안 한 경우
        selectedFiles = [];
        previews = [];
        document.getElementById('previewContainer').innerHTML = '';
    }
}

// 미리보기 아이템 추가
function addPreviewItem(index, base64URL) {
    const previewContainer = document.getElementById('previewContainer');
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('preview-item');

    const imgElem = document.createElement('img');
    imgElem.src = base64URL;

    // X 버튼
    const removeBtn = document.createElement('button');
    removeBtn.classList.add('remove-preview');
    removeBtn.innerText = 'X';
    removeBtn.onclick = () => removePreview(index);

    itemDiv.appendChild(imgElem);
    itemDiv.appendChild(removeBtn);
    previewContainer.appendChild(itemDiv);
}

// 미리보기 아이템 제거
function removePreview(index) {
    selectedFiles.splice(index, 1);
    previews.splice(index, 1);

    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';

    previews.forEach((url, idx) => {
        addPreviewItem(idx, url);
    });
}

// ============================
// [커스텀 메시지(강아지상,고양이상,곰돌이상,공룡상,토끼상)]
// ============================
const customMessages = {
    'dog':    "강아지상",
    'cat':    "고양이상",
    'bear':   "곰돌이상",
    'dinos':  "공룡상",
    'rabbit': "토끼상",
};

// ============================
// [이미지 예측 - 다중]
// ============================
async function predictAll() {
    labelContainer.innerHTML = '';

    if (selectedFiles.length === 0) {
        alert('이미지를 먼저 업로드하세요.');
        return;
    }

    if (!model) {
        alert("AI 모델이 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
        return;
    }

    console.log("🟢 예측 시작... (파일 개수: " + selectedFiles.length + ")");

    // 각 이미지를 순차적으로 예측
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const base64URL = previews[i];
        // 이미지 객체 생성
        const img = new Image();
        img.src = base64URL;

        // 로딩 기다린 후 예측
        await new Promise((resolve) => {
            img.onload = resolve;
        });

        try {
            const prediction = await model.predict(img);
            console.log(`✅ [${file.name}] 예측 성공:`, prediction);

            // UI에 결과 표시
            displayPredictionResult(file.name, base64URL, prediction);

            // 히스토리에 저장
            saveHistory(file.name, base64URL, prediction);
        } catch (error) {
            console.error(`❌ [${file.name}] 예측 중 오류 발생:`, error);
        }
    }
}

// 예측 결과 표시 함수
function displayPredictionResult(fileName, base64URL, prediction) {
    // 결과 정렬 (확률 높은 순)
    prediction.sort((a, b) => b.probability - a.probability);

    // 결과 래퍼
    const resultDiv = document.createElement('div');
    resultDiv.classList.add('prediction-result');

    // 제목
    const title = document.createElement('p');
    title.innerText = `파일: ${fileName}`;
    resultDiv.appendChild(title);

    // 확률 표시 (10% 이상만)
    prediction.forEach((pred) => {
        const probability = (pred.probability * 100).toFixed(2);
        if (probability >= 10) {
            // className을 customMessages에 있으면 치환
            const classLabel = customMessages[pred.className] 
                               ? customMessages[pred.className] 
                               : pred.className;
            const text = document.createElement('p');
            text.innerText = `${classLabel}: ${probability}%`;

            // 막대 그래프
            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');

            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressBar.style.width = `${probability}%`;

            // 색상 강조
            if (probability >= 90) {
                progressBar.style.backgroundColor = "#ff5733";
                text.style.fontWeight = "bold";
                text.innerText += " 🔥 (이것이 확실합니다!)";
            } else if (probability >= 70) {
                progressBar.style.backgroundColor = "#f1c40f";
            } else {
                progressBar.style.backgroundColor = "#1fb264";
            }

            progressContainer.appendChild(progressBar);
            resultDiv.appendChild(text);
            resultDiv.appendChild(progressContainer);
        }
    });

    labelContainer.appendChild(resultDiv);
}

// ============================
// [LocalStorage 예측 히스토리]
// ============================
function initHistorySystem() {
    // 히스토리 토글 버튼
    const toggleBtn = document.getElementById('toggleHistoryBtn');
    toggleBtn.addEventListener('click', () => {
        const historyContainer = document.getElementById('historyContainer');
        if (historyContainer.style.display === 'none') {
            historyContainer.style.display = 'block';
            renderHistory();
        } else {
            historyContainer.style.display = 'none';
        }
    });
}

// 히스토리에 저장
function saveHistory(fileName, base64URL, prediction) {
    let history = JSON.parse(localStorage.getItem('animalFaceHistory') || '[]');

    // 가장 높은 확률 결과
    prediction.sort((a, b) => b.probability - a.probability);
    const topResult = prediction[0];

    // className 치환
    const topClassLabel = customMessages[topResult.className]
                          ? customMessages[topResult.className]
                          : topResult.className;

    const newRecord = {
        timestamp: new Date().toLocaleString(),
        fileName: fileName,
        topClassName: topClassLabel,
        topProbability: (topResult.probability * 100).toFixed(2),
        imageData: base64URL
    };

    history.unshift(newRecord); // 가장 앞에 추가
    localStorage.setItem('animalFaceHistory', JSON.stringify(history));
}

// 히스토리를 UI에 렌더링
function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.innerHTML = '';

    let history = JSON.parse(localStorage.getItem('animalFaceHistory') || '[]');

    if (history.length === 0) {
        historyContainer.innerHTML = '<p>히스토리가 없습니다.</p>';
        return;
    }

    history.forEach((record, idx) => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.style.marginBottom = '10px';
        item.style.border = '1px solid #ececec';
        item.style.padding = '10px';
        item.style.borderRadius = '5px';
        item.innerHTML = `
            <p><strong>${idx + 1}.</strong> [${record.timestamp}]</p>
            <p>파일명: ${record.fileName}</p>
            <p>최고 확률: ${record.topClassName} (${record.topProbability}%)</p>
            <img src="${record.imageData}" style="width:80px; height:80px; object-fit:cover; border:1px solid #ccc; border-radius:5px;">
        `;
        historyContainer.appendChild(item);
    });
}

// ============================
// [SNS 공유 - 트위터 예시]
// ============================
function shareOnTwitter() {
    let history = JSON.parse(localStorage.getItem('animalFaceHistory') || '[]');
    if (history.length === 0) {
        alert('공유할 예측 기록이 없습니다. 먼저 예측을 해보세요.');
        return;
    }

    const latest = history[0]; // 가장 최근 기록
    const text = encodeURIComponent(
        `[동물상 테스트]\n"${latest.fileName}" 이미지 결과 => ${latest.topClassName}상이네요! (${latest.topProbability}%)`
    );
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(twitterUrl, '_blank');
}

// ============================
// [댓글 시스템 + 비속어 필터]
// ============================

// 1) 필터링할 금지 단어들 (간단 예시)
const restrictedWords = [
  "fuck", "shit", "bitch", "asshole", "bastard", "병신", "개새끼", "십새",
  "죽여", "살인", "porno", "야한", "ㅅㅂ", "ㅂㅅ", "존나", "좆",
  "성폭행", "레즈", "딸딸이", "페도", "ㅈ같", "sex"
  // 필요하면 추가
];

// 2) 댓글창 초기화
function initCommentSystem() {
    const submitCommentBtn = document.getElementById("submitCommentBtn");
    const commentInput = document.getElementById("commentInput");
    const commentList = document.getElementById("commentList");

    // 댓글 달기 버튼 클릭 이벤트
    submitCommentBtn.addEventListener("click", () => {
        const comment = commentInput.value.trim();
        if (comment) {
            // 댓글 필터
            if (!isCleanComment(comment)) {
                alert("금지된 표현이 포함되어 있어 댓글을 등록할 수 없습니다.");
                return;
            }
            // 허용된 경우
            const commentDiv = document.createElement("div");
            commentDiv.classList.add("single-comment");
            commentDiv.innerText = comment;
            commentList.appendChild(commentDiv);
            commentInput.value = "";
        }
    });
}

// 3) 비속어·욕설·폭력·음란 필터링 함수
function isCleanComment(comment) {
    let lower = comment.toLowerCase();
    // 단순 포함여부 검사
    for (const word of restrictedWords) {
        if (lower.includes(word)) {
            return false; // 금지어 발견
        }
    }
    return true;
}
