const inputString = document.getElementById("inputString");
const checkButton = document.getElementById("checkButton");
const clearButton = document.getElementById("clearButton");
const result = document.getElementById("result");
const stateFlow = document.getElementById("stateFlow");
const transitionTableBody = document.getElementById("transitionTableBody");
const tableSummary = document.getElementById("tableSummary");
const stateNodes = {
	q0: document.getElementById("state-q0"),
	q1: document.getElementById("state-q1")
};
const stateIndicator = document.getElementById("state-indicator");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const stepDuration = 600;
let activeRun = 0;
let animationTimer;
let indicatorFrame;

function clearDiagramHighlights() {
	clearTimeout(animationTimer);
	if (indicatorFrame !== undefined) {
		cancelAnimationFrame(indicatorFrame);
		indicatorFrame = undefined;
	}
	document.querySelectorAll(".transition.is-active, .transition-label.is-active").forEach((element) => {
		element.classList.remove("is-active");
	});
	Object.values(stateNodes).forEach((stateNode) => {
		stateNode.classList.remove("is-active", "is-accepted", "is-rejected", "is-current");
	});
	stateNodes.q0.classList.add("is-current");
	stateIndicator.classList.remove("is-visible");
	stateIndicator.setAttribute("cx", "120");
	stateIndicator.setAttribute("cy", "140");
}

function animateIndicator(path, run) {
	if (prefersReducedMotion.matches) return;

	const pathLength = path.getTotalLength();
	const startPoint = path.getPointAtLength(0);
	const startedAt = performance.now();
	stateIndicator.setAttribute("cx", startPoint.x);
	stateIndicator.setAttribute("cy", startPoint.y);
	stateIndicator.classList.add("is-visible");

	const moveIndicator = (now) => {
		if (run !== activeRun) return;

		const progress = Math.min((now - startedAt) / stepDuration, 1);
		const point = path.getPointAtLength(pathLength * progress);
		stateIndicator.setAttribute("cx", point.x);
		stateIndicator.setAttribute("cy", point.y);

		if (progress < 1) {
			indicatorFrame = requestAnimationFrame(moveIndicator);
		}
	};

	indicatorFrame = requestAnimationFrame(moveIndicator);
}

inputString.addEventListener("input", () => {
	const isInputEmpty = inputString.value.length === 0;
	const hasInvalidSymbols = /[^01]/.test(inputString.value);
	checkButton.disabled = isInputEmpty || hasInvalidSymbols;
	clearButton.disabled = isInputEmpty;
	if (hasInvalidSymbols) {
		result.textContent = "Invalid input. Please input string {0,1} only.";
		result.className = "invalid";
	} else {
		result.textContent = isInputEmpty ? "Result will be displayed here:" : "";
		result.className = "";
	}
});

checkButton.addEventListener("click", () => {
	const run = ++activeRun;
	clearDiagramHighlights();
	transitionTableBody.replaceChildren();
	tableSummary.textContent = "Processing transitions...";
	tableSummary.className = "table-summary";
	let currentState = "q0";
	const transitions = [];

	for (let index = 0; index < inputString.value.length; index += 1) {
		const symbol = inputString.value[index];
		const nextState = symbol === "1" ? "q1" : "q0";
		transitions.push({
			step: index + 1,
			from: currentState,
			symbol,
			to: nextState,
			isFinal: index === inputString.value.length - 1
		});
		currentState = nextState;
	}

	const accepted = currentState === "q1";
	let transitionIndex = 0;
	let lastTableRow = null;
	result.textContent = "";
	result.className = "";
	stateFlow.replaceChildren();
	const startStep = document.createElement("div");
	startStep.className = "state-transition state-start";
	startStep.textContent = "Start state: q0";
	stateFlow.appendChild(startStep);
	checkButton.disabled = true;
	inputString.disabled = true;

	const showResult = () => {
		if (run !== activeRun) return;

		result.textContent = accepted
			? "Accepted: the string ends in 1."
			: "Rejected: the string must end in 1.";
		result.className = accepted ? "accepted" : "rejected";
		tableSummary.textContent = `Final state: ${currentState}. ${accepted ? "Accepted." : "Rejected."}`;
		tableSummary.className = `table-summary ${accepted ? "accepted" : "rejected"}`;
		if (lastTableRow) {
			const statusLabel = lastTableRow.querySelector(".row-status");
			statusLabel.textContent = accepted ? "Accepted" : "Rejected";
			statusLabel.classList.toggle("rejected", !accepted);
		}
		stateNodes[currentState].classList.add(accepted ? "is-accepted" : "is-rejected");
		checkButton.disabled = false;
		inputString.disabled = false;
	};

	const showNextTransition = () => {
		if (run !== activeRun) return;
		if (transitionIndex === transitions.length) {
			showResult();
			return;
		}

		const transition = transitions[transitionIndex];
		const transitionPath = document.getElementById(`transition-${transition.from}-${transition.symbol}`);
		const transitionLabel = document.getElementById(`label-${transition.from}-${transition.symbol}`);
		const transitionStep = document.createElement("div");
		transitionStep.className = "state-transition";
		transitionStep.textContent = `${transition.from} --${transition.symbol}--> ${transition.to}`;
		stateFlow.appendChild(transitionStep);
		const tableRow = document.createElement("tr");
		tableRow.className = "transition-row is-active";
		const transitionRule = `\u03B4(${transition.from}, ${transition.symbol}) = ${transition.to}`;
		const rowValues = [transitionIndex + 1, transition.from, transition.symbol, transitionRule];
		rowValues.forEach((value) => {
			const cell = document.createElement("td");
			cell.textContent = value;
			tableRow.appendChild(cell);
		});
		const statusCell = document.createElement("td");
		const statusLabel = document.createElement("span");
		statusLabel.className = "row-status";
		statusLabel.textContent = "Animating";
		statusCell.appendChild(statusLabel);
		tableRow.appendChild(statusCell);
		transitionTableBody.appendChild(tableRow);
		lastTableRow = tableRow;
		tableSummary.textContent = `Animating step ${transitionIndex + 1} of ${transitions.length}.`;

		stateNodes[transition.from].classList.add("is-active");
		transitionPath.classList.add("is-active");
		transitionLabel.classList.add("is-active");
		animateIndicator(transitionPath, run);

		animationTimer = setTimeout(() => {
			if (run !== activeRun) return;

			tableRow.classList.remove("is-active");
			tableRow.classList.add("is-complete");
			statusLabel.textContent = "Complete";
			transitionPath.classList.remove("is-active");
			transitionLabel.classList.remove("is-active");
			stateNodes[transition.from].classList.remove("is-active", "is-current");
			stateNodes[transition.to].classList.add("is-current");
			stateIndicator.classList.remove("is-visible");
			if (indicatorFrame !== undefined) {
				cancelAnimationFrame(indicatorFrame);
				indicatorFrame = undefined;
			}
			transitionIndex += 1;
			showNextTransition();
		}, stepDuration);
	};

	showNextTransition();
});

clearButton.addEventListener("click", () => {
	activeRun += 1;
	clearDiagramHighlights();
	transitionTableBody.replaceChildren();
	tableSummary.textContent = "Each processed character will appear here.";
	tableSummary.className = "table-summary";
	inputString.value = "";
	inputString.disabled = false;
	checkButton.disabled = true;
	clearButton.disabled = true;
	result.textContent = "";
	result.className = "";
	stateFlow.textContent = "";
	inputString.focus();
});
